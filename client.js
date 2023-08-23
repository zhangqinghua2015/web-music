(function () {
  /** 播放模式 */
  const PLAYER_MODE = {
    LOOP: {
      value: 'loop',
      cname: '列表循环',
    },
    SINGLE: {
      value: 'single',
      cname: '单曲循环',
    },
    RANDOM: {
      value: 'random',
      cname: '随机循环',
    },
  };
  const CATCH_DATA_KEY = 'MUSIC_DATA';

  const coverDom = document.querySelector('#player .cover img');
  const audioDom = document.querySelector('#audio');
  const listDom = document.querySelector('#list');
  const modalDom = document.querySelector('#modal');
  const preDom = document.querySelector('#player .operate .pre');
  const nextDom = document.querySelector('#player .operate .next');
  const changeDom = document.querySelector('#player .operate .change');
  const DISABLE_LIST_KEY = 'DISABLE_LIST';

  let songList = []; // 歌曲列表
  let currentSong = null; // 当前播放的歌曲
  let playerMode = PLAYER_MODE.RANDOM.value; // 播放模式
  const disabledList = JSON.parse(
    window.localStorage.getItem(DISABLE_LIST_KEY) || '[]',
  ); // 忽略播放的歌曲列表

  main();

  function main() {
    getList();
  }

  /** 创建 歌曲列表 */
  function createItemDom(item, index) {
    return `<div 
      class="item" 
      data-cid="${item.cid}" 
      data-index=${index}
      disabled="${!!item.disabled}"
    >
      <div class="index">${index + 1}</div>
      <div class="name">${item.name}</div>
      <div class="more">
        <img class="remove" src="./icon/remove.svg" alt="移出播放列表" title="移出播放列表" />
        <img class="add" src="./icon/check.svg" alt="加入播放列表" title="加入播放列表" />
      </div>
    </div>`;
  }

  /** 设置播放器内容 */
  function setPlayer(currentItem = currentSong) {
    // 设置封面
    coverDom.setAttribute('src', currentItem.songInfo.picUrl);

    // 设置播放歌曲
    const songUrls = [
      currentItem.songInfo.flac,
      currentItem.songInfo['320'],
      currentItem.songInfo['320'],
    ].filter((s) => !!s);
    audioDom.setAttribute('src', songUrls[0]);

    // 设置列表中播放歌曲的选中项
    document
      .querySelectorAll(`#list .active`)
      .forEach((a) => a.classList.remove('active'));
    document
      .querySelector(`#list .item[data-cid="${currentItem.cid}"]`)
      .classList.add('active');
    document
        .querySelector(`#list .item[data-cid="${currentItem.cid}"]`).scrollIntoView({behavior: 'smooth', block: 'center'});

    // 设置模态框的内容
    modalDom.querySelector('.title').innerHTML = currentSong.songInfo.name;
    modalDom.querySelector('.lyric').innerHTML = currentSong.songInfo.lyric
      .replace(/\r\n/gi, '</br>')
      .replace(/\[(.+?)\]/g, '');
    modalDom
      .querySelector('.cover')
      .setAttribute('src', currentSong.songInfo.bigPicUrl);
  }

  /** 播放/暂停歌曲 */
  function playSong(cid) {
    if (disabledList.includes(cid)) return;
    if (currentSong.cid === cid && !audioDom.paused) {
      // 暂停
      audioDom.pause();
    } else {
      // 播放
      currentSong = songList.find((s) => s.cid === cid);
      setPlayer();
      audioDom.play();
    }
  }

  /** 获取最新的文件地址 */
  function getJsonUrl() {
    return fetch(
        './web-music.json',
      {
        headers: {
          Authorization: '',
          Accept: 'application/vnd.github+json'
        }
      }
    )
      .then((res) => res.json());
      /*.then((res) => {
        // return res.files['jay-music.json'].raw_url;
        return "https://gist.githubusercontent.com/zhangqinghua2015/4aee12553ae3e6b8c143662cfb854770/raw/2c17a3c68eb5d39d0c4810f9c6ddac6ef88ef93a/jay-music.json  ";
      });*/
  }

  function getDataList() {
    return getJsonUrl().then((url) => {
      return fetch(url)
        .then((res) => res.json())
        .then((res) => {
          return res.list;
        });
    });
  }

  /** 拉取歌曲列表 */
  function getList() {
    // window.localStorage.removeItem(CATCH_DATA_KEY);
    const CATCH_DATA = window.localStorage.getItem(CATCH_DATA_KEY);
    const data = isJson(CATCH_DATA);
    if (data) {
      if ((data.validDate = getToday())) {
        renderDataList(data.list);
        return;
      }
    }
    getDataList().then((list) => {
      window.localStorage.setItem(
        CATCH_DATA_KEY,
        JSON.stringify({
          list,
          validDate: getToday(), // 缓存有效日期
        }),
      );
      renderDataList(list);
    });
  }

  function renderDataList(list) {
    songList = list.map((item) => {
      return {
        ...item,
        disabled: disabledList.includes(item.cid),
        songInfo: item.songInfo,
      };
    });
    if (!currentSong) {
      currentSong = songList[0];
    }
    renderList();
    setPlayer();
  }

  function catchDisableList() {
    window.localStorage.setItem(DISABLE_LIST_KEY, JSON.stringify(disabledList));
  }

  // 渲染歌曲列表
  function renderList() {
    listDom.innerHTML = songList.map(createItemDom).join('');
  }

  function addDisableList(cid) {
    disabledList.push(cid);
    songList = songList.map((item) => ({
      ...item,
      disabled: disabledList.includes(item.cid),
    }));
    catchDisableList();
  }

  function removeDisableList(cid) {
    const disInd = disabledList.indexOf(cid);
    disabledList.splice(disInd, 1);
    songList = songList.map((item) => ({
      ...item,
      disabled: disabledList.includes(item.cid),
    }));
    catchDisableList();
  }

  /** 获取下一首有效歌曲 */
  function getNexCurrent() {
    let currentIndex;

    let l = songList.filter((i, ind) => {
      if (i.cid === currentSong.cid) {
        currentIndex = ind;
      }
      return !i.disabled || i.cid === currentSong.cid;
    });
    const next = l[currentIndex + 1];
    if (next) return next;
    return l[0];
  }

  function getPreCurrent() {
    let currentIndex;

    let l = songList.filter((i, ind) => {
      if (i.cid === currentSong.cid) {
        currentIndex = ind;
      }
      return !i.disabled || i.cid === currentSong.cid;
    });
    if (currentIndex === 0) {
      return l[l.length - 1];
    }
    const next = l[currentIndex - 1];
    if (next) return next;
    return l[0];
  }

  function getRandomSong() {
    let currentIndex;

    let l = songList.filter((i, ind) => {
      if (i.cid === currentSong.cid) {
        currentIndex = ind;
      }
      return !i.disabled || i.cid === currentSong.cid;
    });
    let randomIndex = Math.round(Math.random() * l.length);
    const next = l[randomIndex];
    if (next) return next;
    return l[0];
  }

  function change(op) {
    let nextSong;
    // 循环
    if (playerMode === PLAYER_MODE.LOOP.value || playerMode === PLAYER_MODE.SINGLE.value) {
      nextSong = op === 1 ? getNexCurrent().cid : getPreCurrent().cid;
    }
    // 随机
    if (playerMode === PLAYER_MODE.RANDOM.value) {
      nextSong = getRandomSong().cid;
    }
    playSong(nextSong);
  }

  // 移出播放列表
  document.querySelector('#list').addEventListener('click', (e) => {
    // 点击 item
    if (e.target.className.includes('remove')) {
      e.stopPropagation();
      const item = e.target.parentNode.parentNode;
      item.setAttribute('disabled', true);
      const cid = item.getAttribute('data-cid');
      addDisableList(cid);
    }
  });

  // 添加播放列表
  document.querySelector('#list').addEventListener('click', (e) => {
    // 点击 item
    if (e.target.className.includes('add')) {
      e.stopPropagation();
      const item = e.target.parentNode.parentNode;
      item.setAttribute('disabled', false);
      const cid = item.getAttribute('data-cid');
      removeDisableList(cid);
    }
  });

  // 点击 item 播放/暂停
  document.querySelector('#list').addEventListener('click', (e) => {
    let item = null;

    // 点击 item
    if (e.target.className.includes('item')) {
      item = e.target;
    }
    if (e.target.parentNode.className.includes('item')) {
      item = e.target.parentNode;
    }

    if (item) {
      const cid = item.getAttribute('data-cid');
      playSong(cid);
    }
  });

  // 自动播放下一首
  audioDom.onended = (e) => {
    let nextSong;
    // 循环
    if (playerMode === PLAYER_MODE.LOOP.value) {
      nextSong = getNexCurrent().cid;
    }
    // 随机
    if (playerMode === PLAYER_MODE.RANDOM.value) {
      nextSong = getRandomSong().cid;
    }
    // 单曲循环
    if (playerMode === PLAYER_MODE.SINGLE.value) {
      nextSong = currentSong.cid;
    }
    playSong(nextSong);
  };

  let timer;
  // 搜索
  document.querySelector('#search input').addEventListener('input', (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      document.querySelectorAll('#list .item').forEach((item) => {
        const name = item.querySelector('.name').innerText.trim();
        if (!name.includes(e.target.value.trim())) {
          item.style.display = 'none';
        } else {
          item.style.display = '';
        }
      });
    }, 500);
  });

  document.querySelector('#player .cover').addEventListener('click', (e) => {
    modalDom.style.display = 'flex';
  });
  document.querySelector('#modal .footer').addEventListener('click', (e) => {
    modalDom.style.display = '';
  });

  document.querySelector('#player .operate .pre').addEventListener('mousedown', (e) => {
    preDom.style.backgroundColor = '#fff';
  });
  document.querySelector('#player .operate .pre').addEventListener('mouseup', (e) => {
    change(0);
    preDom.style.backgroundColor = '#f6f6f6';
  });

  document.querySelector('#player .operate .next').addEventListener('mousedown', (e) => {
    nextDom.style.backgroundColor = '#fff';
  });
  document.querySelector('#player .operate .next').addEventListener('mouseup', (e) => {
    change(1);
    nextDom.style.backgroundColor = '#f6f6f6';
  });

  document.querySelector('#player .operate .change').addEventListener('mousedown', (e) => {
    changeDom.style.backgroundColor = '#fff';
  });
  document.querySelector('#player .operate .change').addEventListener('mouseup', (e) => {
    if (playerMode === PLAYER_MODE.RANDOM.value) {
      playerMode = PLAYER_MODE.SINGLE.value;
      changeDom.style.backgroundImage = 'url("./icon/single.png")';
    } else if (playerMode === PLAYER_MODE.SINGLE.value) {
      playerMode = PLAYER_MODE.LOOP.value;
      changeDom.style.backgroundImage = 'url("./icon/loop.png")';
    } else if (playerMode === PLAYER_MODE.LOOP.value) {
      playerMode = PLAYER_MODE.RANDOM.value;
      changeDom.style.backgroundImage = 'url("./icon/random.png")';
    }
    changeDom.style.backgroundColor = '#f6f6f6';
  });

})();

function isJson(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return false;
  }
}

function getDate(date) {
  const Y = date.getFullYear();
  const M = date.getMonth();
  const D = date.getDay();

  return `${Y}-${M}-${D}`;
}

function getToday() {
  return getDate(new Date());
}

function getTomorrow() {
  return getDate(new Date(new Date().getTime() + 1000 * 60 * 60 * 24));
}
