from sqlalchemy import BigInteger, Column, ForeignKey, Uuid

from app.db.session import Base


class SkiLessonCustomer(Base):
    __tablename__ = "ski_lesson_customers"

    lesson_id = Column(BigInteger, ForeignKey("ski_lessons.id", ondelete="CASCADE"), primary_key=True)
    customer_id = Column(Uuid, ForeignKey("ski_customers.id"), primary_key=True)
