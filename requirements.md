# prompt generator for E2E test.

## 사용자 흐름
1. 사용자는 크롬에서 이 extension을 활성화 한다.
2. 특정 element에 마우스를 갖다댄다 (hover)
3. 해당 요소가 빨간색으로 하이라이트 된다.
4. 키보드 위아래로 하이라이트를 이동시킨다 (위쪽 키를 누르면 id가 있는 가장 가까운 부모가 하이라이트, 아래키를 누르면 id가 있는 가장 가까운 자식을 찾아서 하이라이트)
5. 스페이스바를 누르면 화면 중앙에 prompt field가 뜬다. 이 prompt field는 그냥 textarea를 포함한 모달이고, 여기에는 action history가 step by step으로 적혀져 있음.

action history란 무엇인가?
- 사용자가 하이라이트된 엘리멘트에서 space를 누르면 그 element의 id가 복사되고, 프롬프트에 붙여넣기가 된다. 그러면 사용자는 거기에 내용을 입력한다. 예를들어서, 

```
1. #the-modal-open-button 을 클릭하면
2. #my-modal 이 뜬다.
3. #my-modal__close-btn 을 클릭하면
4. 모달이 닫힌다.
5. #the-button 를 클릭하면,,,
```

무슨말이냐면, the-button 이 하이라이트된 상황에서 스페이스바를 누르면, [이전 히스토리]의 step + 1가 자동으로 입력되고 (여기서는 이전이 4, 그래서 지금이 5.) 거기에 방금 하이라이트된 id가 복붙된다.
이렇게 유저 액션이 하나하나 쌓여간다.
prompt field 하단에 '복사하기' 버튼을 누르면 지금까지 작성한 프롬프트가 복사된다.

나는 이 프롬프트를 활용해서 AI에게 테스트 코드를 짜달라고 할것이다.