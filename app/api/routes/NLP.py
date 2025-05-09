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

    # Tokenize into words
    words = word_tokenize(punctuated)

    # Clean each word
    lemmatizer = WordNetLemmatizer()
    stop_words = set(stopwords.words('english'))
    keep_words = {
        'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'me', 'him', 'her', 'us', 'them', 'my', 'your',
        'his', 'its', 'our', 'their', 'can', 'could', 'will',
        'would', 'shall', 'should', 'may', 'might', 'must'
    }
    cleaned_words = []
    for word in words:
        word = word.lower()
        word = re.sub(r'[^\w\s]', '', word)
        if word and (word not in stop_words or word in keep_words):
            lemma = lemmatizer.lemmatize(word, pos='v')
            cleaned_words.append(lemma)

    # Load BERT and vectors
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    bert_model = BertModel.from_pretrained('bert-base-uncased')
    bert_model.eval()

    word_df = pd.read_csv("app/SignLanguage_dataset/word_vectors0.csv")
    word_vectors = word_df.drop(columns=["WORD_NAME"]).values
    word_names = word_df["WORD_NAME"].tolist()

    final_ids = []

    for word in tqdm(cleaned_words, desc="Vectorizing Words"):
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
            letters = [char for char in word if char.isalpha()]
            final_ids.extend(letters)

    return final_ids

