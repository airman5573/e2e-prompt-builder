# TodoList 테스트 페이지

E2E Prompt Builder Extension을 테스트하기 위한 예제 웹사이트입니다.

## 🚀 사용 방법

### 1. 페이지 열기
```bash
# 브라우저에서 직접 열기
open index.html

# 또는 파일 경로를 브라우저 주소창에 입력
file:///Users/yoon/Desktop/element-id-copy-chrome-extension-sonnet-to-codex/example/index.html
```

### 2. Extension 테스트하기

#### 기본 기능 테스트
1. **Extension 활성화**
   - Chrome Extension 아이콘 클릭
   - TodoList 페이지에서 활성화

2. **요소 하이라이팅**
   - 마우스를 다양한 요소 위에 올려보세요
   - 빨간 테두리로 하이라이트되는지 확인

3. **키보드 네비게이션**
   - 요소를 hover한 상태에서 `↑` 키: 부모 요소로 이동
   - `↓` 키: 자식 요소로 이동
   - ID가 있는 요소만 선택됩니다

#### E2E 프롬프트 작성 테스트

**시나리오 1: Todo 추가 테스트**
```
1. #todo-input hover → Space 키
   → "1. #todo-input " 삽입됨
   → "에 텍스트를 입력하고" 타이핑
   → Enter

2. #add-todo-btn hover → Space 키
   → "2. #add-todo-btn " 삽입됨
   → "을 클릭하면" 타이핑
   → Enter

3. #todo-list hover → Space 키
   → "3. #todo-list " 삽입됨
   → "에 새 항목이 추가된다" 타이핑
   → 복사 버튼 클릭 (자동 닫힘)
```

**시나리오 2: 모달 열기 테스트**
```
1. #help-btn hover → Space 키
   → "1. #help-btn " 삽입
   → "을 클릭하면" 입력
   → Enter

2. #modal-overlay hover → Space 키
   → "2. #modal-overlay " 삽입
   → "와" 입력
   → ESC (같은 스텝 유지, 공백 자동 추가)

3. #modal-container hover → Space 키
   → "2. #modal-overlay 와 #modal-container " (자동 띄어쓰기!)
   → "가 나타난다" 입력
   → Enter

4. #modal-close-btn hover → Space 키
   → "3. #modal-close-btn " 삽입
   → "을 클릭하면 모달이 닫힌다" 입력
   → 복사
```

**시나리오 3: 필터 기능 테스트**
```
1. #filter-all-btn, #filter-active-btn, #filter-completed-btn 요소들 탐색
2. 화살표 키로 부모/자식 관계 확인
3. 프롬프트 작성
```

## 📋 페이지 구조

### 주요 ID가 있는 요소들

#### Header
- `#app-container` - 전체 앱 컨테이너
- `#header` - 헤더 영역
- `#app-title` - 앱 제목
- `#app-subtitle` - 앱 부제목

#### Main Content
- `#main-content` - 메인 컨텐츠 영역
- `#input-section` - 입력 섹션
- `#todo-input-wrapper` - 입력 래퍼
- `#todo-input` - Todo 입력 필드
- `#add-todo-btn` - 추가 버튼

#### Filter Section
- `#filter-section` - 필터 섹션
- `#filter-all-btn` - 전체 필터
- `#filter-active-btn` - 진행중 필터
- `#filter-completed-btn` - 완료 필터

#### Todo List
- `#list-section` - 리스트 섹션
- `#todo-list` - Todo 목록 (ul)
- `#todo-item-{N}` - 각 Todo 아이템 (li)
- `#checkbox-{N}` - 각 체크박스
- `#text-{N}` - 각 Todo 텍스트
- `#delete-btn-{N}` - 각 삭제 버튼

#### Footer
- `#footer` - 푸터 영역
- `#stats-section` - 통계 섹션
- `#todo-count` - Todo 카운트
- `#clear-completed-btn` - 완료 항목 삭제 버튼
- `#action-buttons` - 액션 버튼들
- `#help-btn` - 도움말 버튼
- `#about-btn` - 정보 버튼

#### Modal
- `#modal-overlay` - 모달 오버레이
- `#modal-container` - 모달 컨테이너
- `#modal-header` - 모달 헤더
- `#modal-title` - 모달 제목
- `#modal-body` - 모달 본문
- `#modal-text` - 모달 텍스트
- `#modal-footer` - 모달 푸터
- `#modal-close-btn` - 모달 닫기 버튼

## ✨ 기능

### TodoList 기능
- ✅ Todo 추가/삭제
- ✅ 완료 체크/해제
- ✅ 필터링 (전체/진행중/완료)
- ✅ 완료된 항목 일괄 삭제
- ✅ 도움말/정보 모달

### Extension 테스트 최적화
- ✅ 모든 요소에 의미있는 ID 부여
- ✅ 명확한 부모-자식 관계 (네비게이션 테스트)
- ✅ 모달 요소 포함 (E2E 시나리오 작성)
- ✅ 다양한 인터랙션 요소 (버튼, 입력, 체크박스 등)
- ✅ 동적으로 추가되는 요소도 ID 자동 부여

## 💡 팁

1. **부모-자식 탐색**
   - `#todo-item-1` → `↓` → `#checkbox-1`, `#text-1`, `#delete-btn-1`
   - `#checkbox-1` → `↑` → `#todo-item-1` → `↑` → `#todo-list`

2. **ESC 키 활용**
   - 여러 요소를 한 스텝에 포함시킬 때 유용
   - 자동으로 공백이 추가되어 다음 ID 삽입이 자연스러움

3. **실제 사용 흐름**
   - 실제로 Todo를 추가/삭제하면서 테스트
   - 모달을 열고 닫으면서 프롬프트 작성
   - 완성된 프롬프트를 AI에게 전달하여 테스트 코드 생성

## 🎯 Extension 완성도 체크리스트

- [ ] 요소 하이라이팅 동작 확인
- [ ] 화살표 키 네비게이션 (부모/자식)
- [ ] Space 키로 모달 열기
- [ ] ID 자동 삽입 확인
- [ ] Enter 키로 스텝 증가
- [ ] ESC 키로 스텝 유지 + 공백 자동 추가
- [ ] 복사 버튼으로 클립보드 복사
- [ ] 복사 후 모달 자동 닫기
- [ ] 키보드 힌트 표시 확인

---

**제작:** PM Claude (Sonnet 4.5)
**목적:** E2E Prompt Builder Extension 테스트
