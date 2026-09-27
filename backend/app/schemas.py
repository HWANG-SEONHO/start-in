# 학습용 설명: schema는 "API 데이터의 약속된 모양"입니다.
# 사용자가 보낸 값이 맞는지 검사하고, 서버가 돌려줄 값의 모양도 여기서 정합니다.
# Pydantic의 Field는 길이·범위 같은 안전 규칙을 적는 도구입니다.

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


# -----------------------------------------------------------------------------
# 회원 / 로그인 데이터
# -----------------------------------------------------------------------------

# 회원가입할 때 브라우저가 서버로 보내야 하는 값입니다.
class Registration(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=10, max_length=128)


# 로그인할 때 필요한 값은 이메일과 비밀번호뿐입니다.
class Login(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


# 서버가 사용자 정보를 돌려줄 때 비밀번호는 절대 포함하지 않습니다.
class UserOut(BaseModel):
    # from_attributes=True 덕분에 SQLAlchemy User 객체를 바로 읽을 수 있습니다.
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str


# 현재 로그인한 사람과 CSRF 토큰을 한 번에 알려주는 응답입니다.
class SessionOut(BaseModel):
    user: UserOut | None
    csrf_token: str | None = None


# -----------------------------------------------------------------------------
# 지원현황 데이터
# -----------------------------------------------------------------------------

# 지원상태는 아무 문자열이나 받지 않고 아래 7개 중 하나만 허용합니다.
class ApplicationUpdate(BaseModel):
    status: Literal['준비중', '지원완료', '서류통과', '면접', '최종합격', '불합격', '취소']
    note: str = Field(default='', max_length=2000)


# -----------------------------------------------------------------------------
# 채용공고 데이터
# -----------------------------------------------------------------------------

# JobFields는 공고가 반드시 가져야 하는 공통 필드입니다.
# DB에서 읽을 때도, 외부 JSON을 가져올 때도 같은 규칙을 재사용합니다.
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
    salary_min: int = Field(ge=0, le=1_000_000_000)
    salary_max: int = Field(ge=0, le=1_000_000_000)
    company_type: str = Field(max_length=30)
    industry: str = Field(max_length=30)
    requirements: list[str] = Field(max_length=20)
    conditions: list[str] = Field(max_length=20)
    benefits: list[str] = Field(max_length=20)
    tags: list[str] = Field(max_length=20)
    description: str = Field(min_length=1, max_length=20_000)
    deadline: date
    created_at: datetime
    is_demo: bool = False

    # 한 필드만 보는 규칙으로는 "최대급여 >= 최소급여"를 검사할 수 없습니다.
    # 그래서 모든 필드가 만들어진 뒤 두 값을 함께 비교합니다.
    @model_validator(mode='after')
    def salary_range(self):
        if self.salary_max < self.salary_min:
            raise ValueError('최대 급여는 최소 급여 이상이어야 합니다.')
        return self


# 기업 한 곳을 화면에 보여줄 때 필요한 값입니다.
class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    size: int


# JobOut은 JobFields에 DB id와 화면용 기업정보를 더한 모양입니다.
class JobOut(JobFields):
    id: int
    company: str
    company_size: int


# 검색 결과 한 페이지입니다.
# items뿐 아니라 페이지 수와 지도용 구·군 개수도 함께 돌려줍니다.
class JobPage(BaseModel):
    items: list[JobOut]
    page: int
    page_size: int
    total: int
    total_pages: int
    district_counts: dict[str, dict[str, int]]
    company_ids: list[int]


# 지원현황 한 줄에는 상태/메모와 해당 공고정보가 같이 들어갑니다.
class ApplicationOut(ApplicationUpdate):
    id: int
    job: JobOut


# -----------------------------------------------------------------------------
# 이력서 데이터
# -----------------------------------------------------------------------------

# 화면에는 PDF 파일 전체가 아니라 파일명과 크기만 보여줍니다.
class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    filename: str
    size: int
