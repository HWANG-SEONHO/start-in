from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, UniqueConstraint, Boolean, Index, LargeBinary
from .database import Base

class Company(Base):
    __tablename__ = 'companies'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=False, default='')
    size = Column(Integer, nullable=False, default=0)

class Job(Base):
    __tablename__ = 'jobs'
    id = Column(Integer, primary_key=True)
    source_key = Column(String(64), nullable=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='RESTRICT'), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    region = Column(String(20), nullable=False, index=True)
    district = Column(String(40), nullable=False)
    category = Column(String(40), nullable=False, index=True)
    education = Column(String(30), nullable=False)
    experience = Column(String(30), nullable=False)
    employment = Column(String(30), nullable=False)
    work_mode = Column(String(30), nullable=False)
    salary_type = Column(String(20), nullable=False)
    salary_min = Column(Integer, nullable=False)
    salary_max = Column(Integer, nullable=False)
    company_type = Column(String(30), nullable=False)
    industry = Column(String(30), nullable=False)
    requirements = Column(JSON, nullable=False)
    conditions = Column(JSON, nullable=False)
    benefits = Column(JSON, nullable=False)
    tags = Column(JSON, nullable=False)
    description = Column(Text, nullable=False)
    deadline = Column(String(10), nullable=False)
    created_at = Column(String(30), nullable=False)
    is_demo = Column(Boolean, nullable=False, default=False)
    __table_args__ = (Index('uq_jobs_source_key', 'source_key', unique=True),)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(254), unique=True, nullable=False)
    name = Column(String(80), nullable=False)
    password_hash = Column(Text, nullable=False)

class Session(Base):
    __tablename__ = 'sessions'
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    csrf_token = Column(String(64), nullable=False)
    expires_at = Column(Integer, nullable=False)

class SavedJob(Base):
    __tablename__ = 'saved_jobs'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)

class Application(Base):
    __tablename__ = 'applications'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), nullable=False, default='준비중')
    note = Column(Text, nullable=False, default='')
    __table_args__ = (UniqueConstraint('user_id', 'job_id'),)

class Resume(Base):
    __tablename__ = 'resumes'
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    filename = Column(String(200), nullable=False)
    size = Column(Integer, nullable=False)
    content = Column(LargeBinary, nullable=False)
