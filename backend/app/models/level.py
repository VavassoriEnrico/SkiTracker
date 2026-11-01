from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, SmallInteger, Text

from app.db.session import Base


class Level(Base):
    __tablename__ = "ski_levels"

    id = Column(BigInteger, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now, nullable=False)
    name = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    technical_goal = Column(Text, nullable=True)
    level_number = Column(SmallInteger, nullable=True)
    video_url = Column(Text, nullable=True)
