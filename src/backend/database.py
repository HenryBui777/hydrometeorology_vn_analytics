import sqlite3
import os
from datetime import datetime

# Lấy đường dẫn tuyệt đối đến file ai_logs.db trong thư mục data/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "data", "ai_logs.db")

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Bảng lưu trữ lịch sử tương tác AI
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_prompt TEXT NOT NULL,
            context_filters TEXT,
            ai_code_generated TEXT,
            ai_explanation TEXT,
            status TEXT DEFAULT 'Pending',
            result_image_base64 TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def insert_log(prompt: str, context: str, code: str, explanation: str):
    # Keep the AI endpoints usable when they are imported by a reload worker or
    # test process before FastAPI's startup hook has run.
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO ai_logs (user_prompt, context_filters, ai_code_generated, ai_explanation)
        VALUES (?, ?, ?, ?)
    ''', (prompt, context, code, explanation))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id

def update_log_status(log_id: int, status: str, final_code: str, result_image: str = None, error_message: str = None):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE ai_logs 
        SET status = ?, ai_code_generated = ?, result_image_base64 = ?, error_message = ?
        WHERE id = ?
    ''', (status, final_code, result_image, error_message, log_id))
    conn.commit()
    conn.close()

def get_all_logs():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM ai_logs ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
