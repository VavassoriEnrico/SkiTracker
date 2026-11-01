from sqlalchemy import BigInteger, Column, ForeignKey, SmallInteger, Text

from app.db.session import Base


class LevelAbility(Base):
    __tablename__ = "ski_abilities"
    
    id = Column(BigInteger, primary_key=True, index=True)
    level_id = Column(BigInteger, ForeignKey("ski_levels.id"), nullable=False)
    ability_number = Column(SmallInteger, nullable=True)
    name = Column(Text, nullable=True)