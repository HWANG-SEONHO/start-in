from typing import Literal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

class Registration(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=10, max_length=128)

class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    name: str

class ApplicationUpdate(BaseModel):
    status: Literal['준비중', '지원완료', '서류통과', '면접', '최종합격', '불합격', '취소']
    note: str = Field(default='', max_length=2000)

class JobFields(BaseModel):
    company_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=200)
    region: str = Field(min_length=1, max_length=20)
    district: str = Field(min_length=1, max_length=40)
    category: str = Field(min_length=1, max_length=40)
    education: str = Field(max_length=30)
    experience: str = Field(max_length=30)
    employment: str = Field(max_length=30)
    work_mode: str = Field(max_length=30)
    salary_type: Literal['연봉', '월급', '시급', '일급']
    salary_min: int = Field(ge=0, le=1000000000)
    salary_max: int = Field(ge=0, le=1000000000)
    company_type: str = Field(max_length=30)
    industry: str = Field(max_length=30)
    requirements: list[str] = Field(max_length=20)
    conditions: list[str] = Field(max_length=20)
    benefits: list[str] = Field(max_length=20)
    tags: list[str] = Field(max_length=20)
    description: str = Field(min_length=1, max_length=20000)
    deadline: date
    created_at: datetime
    is_demo: bool = False

    @model_validator(mode='after')
    def salary_range(self):
        if self.salary_max < self.salary_min:
            raise ValueError('최대 급여는 최소 급여 이상이어야 합니다.')
        return self

class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str
    size: int

class JobOut(JobFields):
    id: int
    company: str
    company_size: int

class JobPage(BaseModel):
    items: list[JobOut]
    page: int
    page_size: int
    total: int
    total_pages: int
    district_counts: dict[str, dict[str, int]]
    company_ids: list[int]

class SessionOut(BaseModel):
    user: UserOut | None
    csrf_token: str | None = None

class ApplicationOut(ApplicationUpdate):
    id: int
    job: JobOut

class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    filename: str
    size: int
