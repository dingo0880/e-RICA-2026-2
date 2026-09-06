# 갤럭시탭에서 GitHub Pages로 접속하기

정적 웹페이지이므로 GitHub Pages 주소로 실행할 수 있습니다. 태블릿에서 Node.js를 설치하거나 노트북 서버를 켜둘 필요가 없습니다. 이 폴더에는 배포 구성을 준비했으며, **아직 실제 GitHub 저장소에 업로드하거나 공개 배포하지는 않았습니다.**

## GitHub에 올리기

1. 사용할 GitHub 저장소를 준비하고 현재 프로젝트를 업로드합니다. `index.html`, `scripts/`, `questions/`, `assets/`, `.github/workflows/pages.yml`을 포함한 소스 폴더를 저장소 루트에 올리세요. `.github`는 숨김 폴더이므로 빠뜨리지 마세요.
2. `node_modules`, `.npm-cache`, `test-results`, `dist`는 올리지 않습니다. `.gitignore`에 설정해두었습니다. `versions/laptop-v1`은 소스 보관용으로 함께 올려도 되지만 실제 사이트에는 배포되지 않습니다.
3. 저장소의 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
4. `main` 또는 `master` 브랜치에 커밋을 올립니다. 이미 업로드했다면 **Actions → Deploy quiz to GitHub Pages → Run workflow**로 실행할 수도 있습니다.
5. Actions 작업이 완료되면 **Settings → Pages**에 표시되는 주소를 갤럭시탭 브라우저로 엽니다. 일반적인 프로젝트 주소 형식은 `https://계정명.github.io/저장소명/`입니다.

저장소 권한·조직 정책에 따라 Pages 활성화 또는 배포 환경 승인이 필요할 수 있습니다. 설정과 배포 흐름은 [GitHub 공식 Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)와 [공식 워크플로 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 기준으로 구성했습니다.

## 자동으로 하는 작업

워크플로는 문제 폴더를 읽어 `quiz-data.js`를 만들고, 문항·이미지 설정을 검증한 뒤 `dist/`의 파일만 배포합니다. 이미지 경로와 폰트 경로를 모두 상대경로로 만들었으므로 저장소명 아래의 주소에서도 작동합니다. 이후 문제 JSON이나 이미지를 바꿔 커밋하면 자동으로 다시 배포합니다.

## 갤럭시탭에서 사용

- 가로 방향을 기준으로 조정했습니다. 게임 선택은 2행 4열, 이미지 보기는 1행 4열입니다. 세로로 돌리면 2열로 바뀝니다.
- 메인에서 일반 모드는 난이도별 랜덤 2문제씩 총 10문제, 기록 모드는 선택한 게임의 25문제 전체를 진행합니다. 두 모드의 순위표는 별도 탭입니다.
- 2960×1848은 패널의 물리 픽셀 수입니다. 실제 웹페이지 배치는 브라우저의 화면 배율·주소창·전체화면 여부에 따라 달라지는 CSS 표시 영역을 기준으로 조절합니다.
- 상단 `⛶` 버튼으로 전체화면을 시도할 수 있습니다. 브라우저가 지원하지 않으면 해당 브라우저의 전체화면 기능을 이용하세요. 화면 확대/축소는 막지 않았습니다.
- 이미지가 있는 질문은 그림을 눌러 크게 볼 수 있습니다. 네 개의 이미지 보기는 탭하면 선택되고, **다음 문제**를 눌러야 제출됩니다.
- 글이 긴 문제, 분할 화면, 화면 확대 상태에서는 아래로 스크롤할 수 있습니다. 내용을 자르거나 답 버튼을 숨기는 방식으로 높이를 고정하지 않았습니다.

## 기록이 저장되는 위치

GitHub에는 프로그램과 문제 파일만 올라갑니다. 참가자 기록은 **접속한 갤럭시탭의 해당 브라우저**에 저장됩니다. 노트북이나 다른 브라우저와 자동으로 합쳐지지 않으며, 사이트 데이터를 삭제하면 사라집니다. 행사 중 같은 브라우저·같은 주소를 계속 사용하고 **전체 기록 CSV**로 보관하세요.

## 로컬에서 배포 결과 확인

```sh
npm run build
node server.cjs --dist
```

`http://localhost:4173`에서 실제 배포 파일만 사용해 미리 볼 수 있습니다. 검증은 다음 명령으로 실행합니다.

```sh
npm test
npm run test:browser
npm run test:tablet
```

터치 입력·DPR을 적용한 1480×924, 1280×800, 1184×740 CSS 뷰포트와 세로 회전에서 검증했습니다. 실제 갤럭시탭 하드웨어에서 직접 테스트한 것은 아니므로 행사 전에 해당 기기에서 이름 입력 키보드·전체화면·이미지 크기를 한 번 확인하세요.
