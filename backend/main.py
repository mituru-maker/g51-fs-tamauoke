from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import json
import os

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限してください
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# スコアデータモデル
class Score(BaseModel):
    name: str
    score: int

class LeaderboardEntry(BaseModel):
    name: str
    score: int

# ランキング保存先ファイル
RANKING_FILE = "rankings.json"

def load_rankings():
    """ランキングを読み込む"""
    if os.path.exists(RANKING_FILE):
        try:
            with open(RANKING_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []

def save_rankings(rankings):
    """ランキングを保存する"""
    with open(RANKING_FILE, "w", encoding="utf-8") as f:
        json.dump(rankings, f, ensure_ascii=False, indent=2)

@app.get("/")
def read_root():
    return {"message": "Action Game Leaderboard API"}

@app.post("/submit")
def submit_score(score: Score):
    """スコアを提出し、ランキングを更新"""
    rankings = load_rankings()
    
    # 新しいスコアを追加
    rankings.append({"name": score.name, "score": score.score})
    
    # スコアで降順にソートし、上位5名を保持
    rankings.sort(key=lambda x: x["score"], reverse=True)
    rankings = rankings[:5]
    
    # 保存
    save_rankings(rankings)
    
    return {"message": "Score submitted successfully", "rankings": rankings}

@app.get("/rankings")
def get_rankings():
    """現在のランキングを取得"""
    rankings = load_rankings()
    return {"rankings": rankings}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
