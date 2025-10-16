# E2E 테스트 프롬프트 생성기 - 상세 구현 계획

## 1. 프로젝트 개요

Chrome Extension으로 웹페이지에서 요소를 선택하고, 그 요소의 ID를 기반으로 E2E 테스트 시나리오를 step-by-step으로 작성할 수 있는 도구.

**목적:** AI에게 전달할 테스트 시나리오 프롬프트를 빠르고 정확하게 생성

**핵심 가치:**
- 요소 선택의 정확성 (실제 DOM에서 직접 선택)
- 빠른 입력 (키보드 위주의 워크플로우)
- 명확한 시나리오 (step-by-step 구조)

---

## 2. 핵심 기능

### 2.1 요소 하이라이팅
- 마우스 hover 시 해당 요소를 빨간색 테두리로 하이라이트
- 하이라이트된 요소의 ID를 내부적으로 저장
- **전제조건:** 모든 선택 가능한 요소는 ID 속성을 가지고 있음

### 2.2 키보드 네비게이션
- **위쪽 화살표 (↑):** ID가 있는 가장 가까운 부모 요소로 이동
- **아래쪽 화살표 (↓):** ID가 있는 가장 가까운 자식 요소로 이동
- 이동 시 하이라이트도 함께 이동

### 2.3 프롬프트 생성 & 관리
- 스페이스바로 프롬프트 필드 열기/ID 추가
- textarea 기반의 자유로운 편집
- step 번호 자동 증가
- 복사 기능

---

## 3. 사용자 플로우 (상세)

### 시나리오 예시: 모달 열고 닫기 테스트

#### Step 1: Extension 활성화
```
사용자: Chrome에서 extension 아이콘 클릭하여 활성화
결과: 페이지에 extension이 inject됨, 이제 hover와 키보드 입력 감지 시작
```

#### Step 2: 첫 번째 요소 선택
```
사용자: "모달 열기" 버튼에 마우스 hover
결과: 버튼이 빨간 테두리로 하이라이트됨
내부 상태: currentElement = <button id="the-modal-open-button">
```

#### Step 3: 첫 프롬프트 입력
```
사용자: 스페이스바 누름
결과:
  - 화면 중앙에 프롬프트 모달 열림
  - textarea 내용: "1. #the-modal-open-button "
  - 커서가 ID 뒤에 위치

사용자: " 을 클릭하면" 타이핑
textarea 내용: "1. #the-modal-open-button 을 클릭하면"

사용자: Enter 키
결과:
  - 내용 저장됨
  - textarea에 "2. " 자동 추가
  - textarea 내용: "1. #the-modal-open-button 을 클릭하면\n2. "
  - 모달 닫힘
  - 하이라이트 모드로 복귀
```

#### Step 4: 두 번째 요소 선택
```
사용자: 모달 요소에 마우스 hover
결과: 모달이 빨간 테두리로 하이라이트됨
내부 상태: currentElement = <div id="my-modal">
```

#### Step 5: 두 번째 프롬프트 입력
```
사용자: 스페이스바 누름
결과:
  - 모달 다시 열림
  - textarea 내용: "1. #the-modal-open-button 을 클릭하면\n2. #my-modal "
  - 이번엔 step 번호 없이 ID만 추가됨 (이전 Enter로 "2. " 이미 있었음)

사용자: " 이 나타난다." 타이핑
textarea 내용:
"1. #the-modal-open-button 을 클릭하면
2. #my-modal 이 나타난다."

사용자: Enter 키
결과:
  - textarea에 "3. " 추가
  - 모달 닫힘
```

#### Step 6: 여러 요소를 한 step에 포함 (ESC 사용)
```
사용자: 모달 내부의 닫기 버튼 hover
사용자: 스페이스바
textarea 내용:
"1. #the-modal-open-button 을 클릭하면
2. #my-modal 이 나타난다.
3. #my-modal__close-btn "

사용자: " 과 " 타이핑
사용자: ESC 키  ← 주목!
결과:
  - 현재 내용 저장
  - step 번호 그대로 유지 (여전히 "3. ")
  - 모달 닫힘

사용자: 모달 배경(overlay) hover
사용자: 스페이스바
textarea 내용:
"1. #the-modal-open-button 을 클릭하면
2. #my-modal 이 나타난다.
3. #my-modal__close-btn 과 #modal-overlay "
  ↑ "3. " 그대로, ID만 추가됨

사용자: " 을 클릭하면" 타이핑
사용자: Enter 키
결과:
  - "4. " 추가
  - 모달 닫힘

최종 textarea:
"1. #the-modal-open-button 을 클릭하면
2. #my-modal 이 나타난다.
3. #my-modal__close-btn 과 #modal-overlay 을 클릭하면
4. "
```

#### Step 7: 프롬프트 복사
```
사용자: 프롬프트 모달 하단의 "복사하기" 버튼 클릭
결과: 클립보드에 전체 내용 복사됨
```

---

## 4. 키보드 인터랙션 명세

### 4.1 하이라이트 모드 (기본 상태)

| 키 | 동작 | 상세 |
|---|---|---|
| **마우스 이동** | 요소 하이라이트 | hover된 요소를 빨간 테두리로 표시 |
| **↑ (위)** | 부모로 이동 | ID가 있는 가장 가까운 부모 요소로 하이라이트 이동 |
| **↓ (아래)** | 자식으로 이동 | ID가 있는 가장 가까운 자식 요소로 하이라이트 이동 |
| **Space** | 프롬프트 모달 열기 | 현재 하이라이트된 요소의 ID를 textarea에 추가 |

### 4.2 프롬프트 모달 열림 상태

| 키 | 동작 | 상세 |
|---|---|---|
| **일반 타이핑** | textarea 입력 | 사용자가 자유롭게 텍스트 입력 |
| **Enter** | Step 완료 + 다음 준비 | 1. 현재 내용 저장<br>2. 새 줄 + 다음 step 번호 추가<br>3. 모달 닫기<br>4. 하이라이트 모드 복귀 |
| **ESC** | 현재 step 유지 | 1. 현재 내용 저장<br>2. step 번호 그대로 유지<br>3. 모달 닫기<br>4. 하이라이트 모드 복귀 |

---

## 5. UI 컴포넌트

### 5.1 하이라이트 오버레이
```css
/* 하이라이트된 요소에 적용 */
{
  outline: 2px solid red;
  outline-offset: 2px;
  position: relative;
  z-index: 999998;
}
```

**요구사항:**
- 페이지 레이아웃에 영향을 주지 않아야 함 (outline 사용)
- 다른 요소들 위에 표시되어야 함 (z-index)
- 부드러운 전환 (transition)

### 5.2 프롬프트 모달

**레이아웃:**
```
┌─────────────────────────────────────┐
│  E2E 테스트 시나리오                  │  ← 타이틀
├─────────────────────────────────────┤
│                                     │
│  [textarea - 가변 높이]              │
│  1. #button 을 클릭하면               │
│  2. #modal 이 나타난다.               │
│  3.                                 │
│                                     │
├─────────────────────────────────────┤
│  [복사하기 버튼]                      │  ← 하단 버튼
└─────────────────────────────────────┘
```

**스타일 요구사항:**
- 화면 중앙에 고정 위치
- 배경 반투명 오버레이 (dim 처리)
- 모달 z-index: 999999 (하이라이트보다 위)
- textarea:
  - 최소 높이: 200px
  - 최대 높이: 60vh (스크롤 가능)
  - monospace 폰트 (코드처럼 보이도록)
  - padding: 16px
- 복사 버튼: 우측 하단 배치

---

## 6. 상태 관리

### 6.1 Extension 상태

```javascript
const state = {
  // 현재 모드
  mode: 'highlight' | 'modal-open',

  // 현재 하이라이트된 요소
  currentElement: HTMLElement | null,

  // 프롬프트 전체 내용
  promptText: string,

  // 현재 step 번호
  currentStepNumber: number,

  // 모달 열림 상태
  isModalOpen: boolean,
}
```

### 6.2 상태 전환 다이어그램

```
[Extension 비활성]
    ↓ (사용자가 extension 활성화)
[하이라이트 모드]
    ↓ (Space)
[모달 열림]
    ↓ (Enter)
[하이라이트 모드] + stepNumber++
    ↓ (Space)
[모달 열림]
    ↓ (ESC)
[하이라이트 모드] + stepNumber 유지
    ↓ (Space)
[모달 열림]
    ...
```

---

## 7. 기술 스택 & 파일 구조

### 7.1 Chrome Extension 구조

```
manifest.json          ← Extension 설정
background.js          ← 백그라운드 스크립트 (extension on/off 관리)
contentScript.js       ← 메인 로직 (페이지에 inject)
styles.css            ← UI 스타일 (새로 추가)
```

### 7.2 manifest.json 주요 설정

```json
{
  "manifest_version": 3,
  "name": "E2E Test Prompt Generator",
  "permissions": ["activeTab", "scripting"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["contentScript.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Toggle E2E Prompt Generator"
  }
}
```

---

## 8. 구현 상세

### 8.1 요소 하이라이팅 로직

```javascript
// 마우스 이벤트 리스너
document.addEventListener('mouseover', (e) => {
  if (state.mode !== 'highlight') return;

  const element = e.target;

  // ID가 있는 요소만 하이라이트
  if (element.id) {
    removeHighlight(state.currentElement);
    addHighlight(element);
    state.currentElement = element;
  }
});

function addHighlight(element) {
  element.style.outline = '2px solid red';
  element.style.outlineOffset = '2px';
}

function removeHighlight(element) {
  if (element) {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }
}
```

### 8.2 키보드 네비게이션 (↑↓)

```javascript
document.addEventListener('keydown', (e) => {
  if (state.mode !== 'highlight') return;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateToParent();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateToChild();
  }
});

function navigateToParent() {
  if (!state.currentElement) return;

  let parent = state.currentElement.parentElement;

  // ID가 있는 부모를 찾을 때까지 상위로 이동
  while (parent) {
    if (parent.id) {
      removeHighlight(state.currentElement);
      addHighlight(parent);
      state.currentElement = parent;
      return;
    }
    parent = parent.parentElement;
  }
}

function navigateToChild() {
  if (!state.currentElement) return;

  // ID가 있는 첫 번째 자식 찾기 (DFS)
  const findChildWithId = (element) => {
    for (let child of element.children) {
      if (child.id) return child;
      const found = findChildWithId(child);
      if (found) return found;
    }
    return null;
  };

  const child = findChildWithId(state.currentElement);
  if (child) {
    removeHighlight(state.currentElement);
    addHighlight(child);
    state.currentElement = child;
  }
}
```

### 8.3 프롬프트 모달 열기 (Space)

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && state.mode === 'highlight') {
    e.preventDefault();
    openModal();
  }
});

function openModal() {
  if (!state.currentElement) return;

  state.mode = 'modal-open';

  // 첫 번째 step인지 확인
  const isFirstStep = state.currentStepNumber === 1 && state.promptText === '';

  // ID 추가
  const elementId = `#${state.currentElement.id}`;

  if (isFirstStep) {
    // 첫 번째: "1. #id " 형태
    state.promptText = `1. ${elementId} `;
  } else {
    // 이후: 현재 커서 위치에 "#id " 추가
    state.promptText += elementId + ' ';
  }

  // 모달 UI 표시
  showModalUI();

  // textarea에 내용 설정하고 포커스
  const textarea = document.querySelector('#prompt-textarea');
  textarea.value = state.promptText;
  textarea.focus();

  // 커서를 맨 끝으로
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
}
```

### 8.4 모달 내 키보드 처리 (Enter/ESC)

```javascript
// 모달이 열려있을 때만 동작
const textarea = document.querySelector('#prompt-textarea');

textarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleEnter();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    handleEscape();
  }
});

function handleEnter() {
  // 1. 현재 textarea 내용 저장
  state.promptText = textarea.value;

  // 2. step 번호 증가
  state.currentStepNumber++;

  // 3. 새 줄 + 다음 step 번호 추가
  state.promptText += `\n${state.currentStepNumber}. `;

  // 4. 모달 닫기
  closeModal();
}

function handleEscape() {
  // 1. 현재 textarea 내용 저장
  state.promptText = textarea.value;

  // 2. step 번호는 그대로 유지

  // 3. 모달 닫기
  closeModal();
}

function closeModal() {
  state.mode = 'highlight';
  hideModalUI();
}
```

### 8.5 모달 UI 생성

```javascript
function createModalUI() {
  const overlay = document.createElement('div');
  overlay.id = 'e2e-prompt-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const modal = document.createElement('div');
  modal.id = 'e2e-prompt-modal';
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    width: 600px;
    max-width: 90vw;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;

  modal.innerHTML = `
    <h2 style="margin: 0 0 16px 0; font-size: 18px;">E2E 테스트 시나리오</h2>
    <textarea
      id="prompt-textarea"
      style="
        width: 100%;
        min-height: 200px;
        max-height: 60vh;
        padding: 16px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid #ccc;
        border-radius: 4px;
        resize: vertical;
      "
    ></textarea>
    <div style="margin-top: 16px; text-align: right;">
      <button
        id="copy-prompt-btn"
        style="
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        "
      >복사하기</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 복사 버튼 이벤트
  document.querySelector('#copy-prompt-btn').addEventListener('click', () => {
    const textarea = document.querySelector('#prompt-textarea');
    navigator.clipboard.writeText(textarea.value);

    // 피드백 표시 (선택사항)
    const btn = document.querySelector('#copy-prompt-btn');
    btn.textContent = '복사됨!';
    setTimeout(() => {
      btn.textContent = '복사하기';
    }, 2000);
  });

  // 오버레이 클릭 시 모달 닫기 방지
  modal.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function showModalUI() {
  let overlay = document.querySelector('#e2e-prompt-overlay');
  if (!overlay) {
    createModalUI();
    overlay = document.querySelector('#e2e-prompt-overlay');
  }
  overlay.style.display = 'flex';
}

function hideModalUI() {
  const overlay = document.querySelector('#e2e-prompt-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}
```

---

## 9. 엣지 케이스 처리

### 9.1 ID가 없는 요소
- **전제:** 모든 선택 가능한 요소는 ID를 가짐
- 하지만 방어적 코드로 ID 체크는 유지
- ID 없는 요소는 hover 시 하이라이트 안 됨

### 9.2 중첩된 요소들
- 자식으로 이동 시 가장 가까운(첫 번째) ID 있는 자식만 선택
- 형제 요소로 이동은 현재 버전에서 지원 안 함 (필요시 추가)

### 9.3 동적 요소
- 페이지 변경으로 이전 요소가 사라진 경우
  - state.currentElement 참조가 깨질 수 있음
  - 안전장치: 매번 element 존재 확인

```javascript
function safeGetCurrentElement() {
  if (state.currentElement && document.contains(state.currentElement)) {
    return state.currentElement;
  }
  state.currentElement = null;
  return null;
}
```

### 9.4 페이지 새로고침
- Extension 상태 초기화됨
- promptText는 textarea에만 존재 (사용자가 복사해야 함)
- 향후 개선: localStorage에 자동 저장 기능 추가 가능

### 9.5 모달 열린 상태에서 다른 키 입력
- textarea 내에서는 일반 타이핑만 허용
- 화살표 키, Backspace 등은 textarea 기본 동작 유지
- Space는 textarea에서 정상 동작 (공백 입력)

---

## 10. 개발 단계

### Phase 1: 기본 하이라이팅
- [ ] Extension 구조 설정 (manifest.json)
- [ ] contentScript 기본 inject
- [ ] 마우스 hover 하이라이팅
- [ ] 하이라이트 스타일링

### Phase 2: 키보드 네비게이션
- [ ] 위/아래 화살표로 부모/자식 이동
- [ ] ID 있는 요소만 선택 로직

### Phase 3: 프롬프트 모달
- [ ] 모달 UI 생성
- [ ] Space로 모달 열기
- [ ] ID 자동 추가 로직
- [ ] textarea 포커스 & 커서 위치

### Phase 4: Enter/ESC 처리
- [ ] Enter: step 증가 로직
- [ ] ESC: step 유지 로직
- [ ] 상태 관리 완성

### Phase 5: 복사 & 마무리
- [ ] 복사 버튼 구현
- [ ] UI 폴리싱
- [ ] 버그 테스트
- [ ] 사용성 개선

---

## 11. 테스트 시나리오

### 테스트 1: 기본 플로우
1. Extension 활성화
2. 버튼 hover → 빨간 테두리 확인
3. Space → 모달 열림, "1. #button-id " 확인
4. "을 클릭하면" 입력
5. Enter → "2. " 추가 확인, 모달 닫힘
6. 다른 요소 hover
7. Space → "#element-id " 추가 확인 (step 번호 없음)
8. 텍스트 입력 후 Enter
9. 복사 버튼 → 클립보드 확인

### 테스트 2: ESC 플로우
1. Step 3까지 진행
2. Space → "#element-1 " 추가
3. " 과 " 입력
4. ESC → 모달 닫힘
5. 다른 요소 hover
6. Space → "#element-2 " 추가됨, step은 여전히 3 확인
7. 텍스트 완성 후 Enter → step 4로 증가 확인

### 테스트 3: 키보드 네비게이션
1. 요소 hover
2. 위 화살표 여러 번 → 부모로 이동 확인
3. 아래 화살표 → 자식으로 이동 확인
4. ID 없는 요소는 건너뛰기 확인

### 테스트 4: 엣지 케이스
1. ID 없는 요소 hover → 하이라이트 안 됨 확인
2. 최상위 요소에서 위 화살표 → 변화 없음 확인
3. 자식 없는 요소에서 아래 화살표 → 변화 없음 확인
4. 모달 열린 상태에서 Shift+Enter → 줄바꿈 확인 (step 증가 안 됨)

---

## 12. 향후 개선 아이디어

### 우선순위 높음
- [ ] localStorage 자동 저장 (새로고침 대비)
- [ ] 단축키 커스터마이징
- [ ] 다크 모드 지원

### 우선순위 중간
- [ ] 형제 요소 이동 (←/→ 화살표)
- [ ] 여러 선택자 지원 (data-testid, class 등)
- [ ] 프롬프트 템플릿 (자주 쓰는 패턴)

### 우선순위 낮음
- [ ] AI 연동 (직접 테스트 코드 생성)
- [ ] 히스토리 관리 (이전 세션 불러오기)
- [ ] 팀 공유 기능

---

## 13. 주의사항

### 보안
- `<all_urls>` 권한 사용 시 사용자에게 명확히 설명
- 사용자 입력은 textarea에만 저장 (외부 전송 없음)

### 성능
- 이벤트 리스너 최소화
- 불필요한 DOM 조작 방지
- 하이라이트 스타일은 outline 사용 (reflow 방지)

### 호환성
- Chrome Extension Manifest V3 사용
- 최신 Chrome 버전 타겟
- 다른 extension과의 충돌 최소화 (고유한 ID/클래스 사용)

---

## 14. 완성 기준

- [x] 요구사항 문서의 모든 기능 구현
- [ ] 3가지 이상의 실제 웹사이트에서 테스트 성공
- [ ] 버그 없이 30분 이상 연속 사용 가능
- [ ] 코드 리뷰 & 리팩토링 완료
- [ ] README 작성 (사용법, 설치법)

---

**작성일:** 2025-10-16
**작성자:** Claude (Sonnet 4.5)
**버전:** 1.0
