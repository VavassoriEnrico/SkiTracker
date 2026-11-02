from datetime import datetime

from sqlalchemy import Column, DateTime, Date, SmallInteger, Text, Uuid

from app.db.session import Base

class SkiCustomer(Base):
    __tablename__ = "ski_customers"
    
    id = Column(Uuid, primary_key = True, index = True)
    created_at = Column(DateTime, default = datetime.now, nullable = False)
    name = Column(Text, nullable=True)
    surname = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    profile_image_url = Column(Text, nullable=True)
    username = Column(Text, nullable=True)
    birth_date = Column(Date, nullable=True)
    sex = Column(Text, nullable=True)
    level = Column(SmallInteger, nullable=True)
    ability = Column(SmallInteger, nullable=True)
