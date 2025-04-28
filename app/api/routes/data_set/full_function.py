import re
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

# Step 1: Add punctuation to raw text
text = "input lenna"
punct_model = PunctuationModel()
punctuated = punct_model.restore_punctuation(text)
print("Punctuated Text:\n", punctuated)

# Step 2: Split into sentences
sentences0 = sent_tokenize(punctuated)
print("Split Sentences:\n", sentences0)

# Step 3: Sentence cleaning function
def clean_sentence(sentence):
    sentence = sentence.lower()
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

# Step 4: Clean all sentences
sentences = [clean_sentence(s) for s in sentences0]

# Step 5: Load BERT for vectorization
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
bert_model = BertModel.from_pretrained('bert-base-uncased')
bert_model.eval()

# Step 6: Vectorize sentences
vectors = []
for sentence in tqdm(sentences, desc="Vectorizing Sentences"):
    inputs = tokenizer(sentence, return_tensors='pt', padding=True, truncation=True)
    with torch.no_grad():
        outputs = bert_model(**inputs)
    embedding = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()
    vectors.append(embedding)

# Load the dataset with VIDEO_ID and vector columns
df = pd.read_csv("sentence dataset path")

# Extract vectors only (drop VIDEO_ID)
dataset_vectors = df.drop(columns=["SENTENCE_NAME"]).values

# Load the word dataset
word_df = pd.read_csv("word dataset path")  # Make sure it has 'WORD_NAME' and vector columns
word_vectors = word_df.drop(columns=["WORD_NAME"]).values
word_names = word_df["WORD_NAME"].tolist()


# This will store the best matching VIDEO_IDs and similarity scores
# Final result list
final_ids = []

# Loop through sentence vectors
for i, vec in enumerate(vectors):
    vec = vec.reshape(1, -1)
    similarities = cosine_similarity(vec, dataset_vectors)
    best_idx = np.argmax(similarities)
    best_similarity = similarities[0][best_idx]
    
    if best_similarity >= 0.85:
        final_ids.append(df.iloc[best_idx]["SENTENCE_NAME"])
    else:
        # Sentence fallback: word-level
        words = word_tokenize(sentences[i])
        cleaned_words = [re.sub(r'[^\w\s]', '', w.lower()) for w in words if w.strip()]
        
        word_level_matches = []
        for word in cleaned_words:
            inputs = tokenizer(word, return_tensors='pt')
            with torch.no_grad():
                output = bert_model(**inputs)
            word_vec = output.last_hidden_state.mean(dim=1).squeeze().numpy().reshape(1, -1)

            similarities = cosine_similarity(word_vec, word_vectors)
            best_word_idx = np.argmax(similarities)
            best_word_similarity = similarities[0][best_word_idx]
            
            if best_word_similarity >= 0.85:
                best_word = word_names[best_word_idx]
                word_level_matches.append(best_word)
            else:
                # Word fallback: letter-level
                letters = [char for char in word if char.isalpha()]
                word_level_matches.append(letters)

        final_ids.append(word_level_matches)

# Final result
print("Final List of Sentence/Word/Letter Matches:")
print(final_ids)