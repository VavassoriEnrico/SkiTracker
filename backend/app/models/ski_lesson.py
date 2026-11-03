from sqlalchemy import BigInteger, Column, ForeignKey, Uuid, Date, Time

from app.db.session import Base


class SkiLesson(Base):
    __tablename__ = "ski_lessons"

    id = Column(BigInteger, primary_key=True, index=True)
    instructor_id = Column(Uuid, ForeignKey("ski_instructors.id"), nullable=False)
    lesson_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
