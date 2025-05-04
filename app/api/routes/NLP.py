import re
import nltk
import torch
import pandas as pd
import numpy as np
from tqdm import tqdm
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from transformers import BertTokenizer, BertModel
from sklearn.metrics.pairwise import cosine_similarity
from deepmultilingualpunctuation import PunctuationModel

# Sentence cleaning function
def clean_sentence(sentence):
    sentence = str(sentence).lower()
    sentence = re.sub(r'[^\w\s]', '', sentence)
    sentence = re.sub(r'\s+', ' ', sentence).strip()
    tokens = word_tokenize(sentence)
    stop_words = set(stopwords.words('english'))
    keep_words = {
        'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'me', 'him', 'her', 'us', 'them', 'my', 'your',
        'his', 'its', 'our', 'their', 'can', 'could', 'will',
        'would', 'shall', 'should', 'may', 'might', 'must'
    }
    filtered_tokens = [word for word in tokens if word not in stop_words or word in keep_words]
    lemmatizer = WordNetLemmatizer()
    lemmatized_tokens = [lemmatizer.lemmatize(word, pos='v') for word in filtered_tokens]
    return ' '.join(lemmatized_tokens)

def NLP(text):
    punct_model = PunctuationModel()
    punctuated = punct_model.restore_punctuation(text)
    sentences0 = sent_tokenize(punctuated)
    sentences = [clean_sentence(s) for s in sentences0]

    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    bert_model = BertModel.from_pretrained('bert-base-uncased')
    bert_model.eval()

    vectors = []
    for sentence in tqdm(sentences, desc="Vectorizing Sentences"):
        inputs = tokenizer(sentence, return_tensors='pt', padding=True, truncation=True)
        with torch.no_grad():
            outputs = bert_model(**inputs)
        embedding = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()
        vectors.append(embedding)

    df = pd.read_csv("app/SignLanguage_dataset/video_vectors_finale.csv")
    dataset_vectors = df.drop(columns=["SENTENCE_NAME"]).values

    word_df = pd.read_csv("app/SignLanguage_dataset/word_vectors0.csv")
    word_vectors = word_df.drop(columns=["WORD_NAME"]).values
    word_names = word_df["WORD_NAME"].tolist()

    final_ids = []

    for i, vec in enumerate(vectors):
        vec = vec.reshape(1, -1)
        similarities = cosine_similarity(vec, dataset_vectors)
        best_idx = np.argmax(similarities)
        best_similarity = similarities[0][best_idx]

        if best_similarity >= 0.85:
            final_ids.append(df.iloc[best_idx]["SENTENCE_NAME"])
        else:
            words = word_tokenize(sentences[i])
            cleaned_words = [re.sub(r'[^\w\s]', '', w.lower()) for w in words if w.strip()]

            for word in cleaned_words:
                inputs = tokenizer(word, return_tensors='pt')
                with torch.no_grad():
                    output = bert_model(**inputs)
                word_vec = output.last_hidden_state.mean(dim=1).squeeze().numpy().reshape(1, -1)

                similarities = cosine_similarity(word_vec, word_vectors)
                best_word_idx = np.argmax(similarities)
                best_word_similarity = similarities[0][best_word_idx]

                if best_word_similarity >= 0.85:
                    final_ids.append(word_names[best_word_idx])
                else:
                    # Add individual letters (not as a list, but one by one)
                    letters = [char for char in word if char.isalpha()]
                    final_ids.extend(letters)  # flatten letters into the main list

    return final_ids
