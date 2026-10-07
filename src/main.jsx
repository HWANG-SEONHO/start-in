// 이 파일은 React 앱의 "시작 버튼"입니다.
// 흐름: index.html의 #root 찾기 → Router 준비 → 로그인 정보 준비 → App 화면 그리기.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AccountProvider } from './services/AccountContext';
import './styles/main.css';
import './styles/viewport.css';

// index.html 안의 <div id="root">를 React가 사용할 자리로 바꿉니다.
const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// BrowserRouter: 주소(URL)에 따라 어떤 페이지를 보여줄지 도와줍니다.
// AccountProvider: 로그인한 사용자 정보를 여러 화면에서 함께 쓰게 해줍니다.
root.render(
  <BrowserRouter>
    <AccountProvider>
      <App />
    </AccountProvider>
  </BrowserRouter>,
);
