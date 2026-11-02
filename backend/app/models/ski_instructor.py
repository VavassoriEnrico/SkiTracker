from datetime import datetime

from sqlalchemy import Column, DateTime, Date, Text, Uuid

from app.db.session import Base


class SkiInstructor(Base):
    __tablename__ = "ski_instructors"
    
    id = Column(Uuid, primary_key = True, index = True)
    created_at = Column(DateTime, default = datetime.now, nullable = False)
    name = Column(Text, nullable=True)
    surname = Column(Text, nullable=True)
    username = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    birth_date = Column(Date, nullable=True)
