from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

app = FastAPI()

# データベース設定
DATA_DIR = "data"
DB_PATH = os.path.join(DATA_DIR, "database.db")

# データディレクトリを作成
os.makedirs(DATA_DIR, exist_ok=True)

# データベースエンジン
engine = create_engine(f"sqlite:///{DB_PATH}")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# データベースモデル
class Score(Base):
    __tablename__ = "scores"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# テーブルを作成
Base.metadata.create_all(bind=engine)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限してください
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# スコアデータモデル
class ScoreRequest(BaseModel):
    name: str
    score: int

class ScoreResponse(BaseModel):
    id: int
    name: str
    score: int
    created_at: datetime
    
    class Config:
        from_attributes = True

def get_db():
    """データベースセッションを取得"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass

@app.get("/")
def read_root():
    return {"message": "Action Game Leaderboard API"}

@app.post("/submit")
def submit_score(score_request: ScoreRequest):
    """スコアを提出し、ランキングを更新"""
    db = get_db()
    
    # 新しいスコアをデータベースに保存
    new_score = Score(name=score_request.name, score=score_request.score)
    db.add(new_score)
    db.commit()
    db.refresh(new_score)
    
    # 上位5名を取得
    top_scores = db.query(Score).order_by(Score.score.desc()).limit(5).all()
    
    # レスポンス形式に変換
    rankings = [
        {
            "id": score.id,
            "name": score.name,
            "score": score.score,
            "created_at": score.created_at.isoformat()
        }
        for score in top_scores
    ]
    
    return {"message": "Score submitted successfully", "rankings": rankings}

@app.get("/rankings")
def get_rankings():
    """現在のランキングを取得"""
    db = get_db()
    
    # 上位5名を取得
    top_scores = db.query(Score).order_by(Score.score.desc()).limit(5).all()
    
    # レスポンス形式に変換
    rankings = [
        {
            "id": score.id,
            "name": score.name,
            "score": score.score,
            "created_at": score.created_at.isoformat()
        }
        for score in top_scores
    ]
    
    return {"rankings": rankings}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
