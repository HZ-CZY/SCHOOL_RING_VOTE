// ==================== 综合管理后台 - 统一 JavaScript ====================

const API_BASE = '/submit/api.php';
const VOTE_API_BASE = '/vote/';

// ==================== 工具函数 ====================
// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 优化 DOM 操作 - 使用文档片段
function createDocumentFragment() {
    return document.createDocumentFragment();
}

// 懒加载图片
function lazyLoadImage(imgElement, src) {
    if ('loading' in HTMLImageElement.prototype) {
        imgElement.loading = 'lazy';
    }
    imgElement.src = src;
}

// ==================== 登录认证 ====================
function checkLoginStatus() {
    fetch(API_BASE + '?action=check_login')
        .then(res => res.json())
        .then(data => {
            if (data.logged_in) {
                document.getElementById('login-overlay').style.display = 'none';
                document.getElementById('app-container').style.display = 'flex';
                loadAllData();
            }
        })
        .catch(err => console.error('检查登录状态失败', err));
}

function login() {
    const pwd = document.getElementById('admin-pwd').value;
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'verify_login', password: pwd})
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            loadAllData();
        } else {
            alert('密码错误！');
        }
    })
    .catch(err => alert('登录失败，请稍后重试'));
}

function logout() {
    if (!confirm('确定要退出登录吗？')) return;
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'logout'})
    })
    .then(() => {
        location.reload();
    });
}

// ==================== 导航切换 ====================
function switchModule(moduleId) {
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // 显示目标面板
    document.getElementById(moduleId).classList.add('active');
    
    // 更新导航激活状态
    event.currentTarget.classList.add('active');
    
    // 更新页面标题
    const titleMap = {
        'submit-approved': '已筛选投稿',
        'submit-all': '全部投稿',
        'submit-rejected': '未选中投稿',
        'submit-qa': 'Q&A 管理',
        'feedback-list': '用户反馈',
        'vote-music': '音乐管理',
        'vote-stats': '投票统计',
        'vote-records': '投票记录',
        'vote-reset': '音频管理',
        'vote-download': '歌曲下载管理',
        'settings-announcement': '公告管理',
        'settings-system': '系统设置',
        'settings-changelog': '更新日志'
    };
    
    document.getElementById('pageTitle').innerHTML = '<i class="fas fa-home"></i> ' + titleMap[moduleId];
    
    // 加载对应数据
    loadModuleData(moduleId);
}

// ==================== 数据加载 ====================
function loadAllData() {
    loadSubmitData();
    loadFeedbackData();
    loadMusicList();
    loadVoteRecords();
    loadAnnouncement();
    loadSystemSettings();
}

function loadModuleData(moduleId) {
    switch(moduleId) {
        case 'submit-approved':
        case 'submit-all':
        case 'submit-rejected':
            loadSubmitData();
            break;
        case 'feedback-list':
            loadFeedbackData();
            break;
        case 'vote-music':
            loadMusicList();
            break;
        case 'vote-stats':
        case 'vote-records':
            loadVoteRecords();
            break;
        case 'vote-download':
            loadDownloadMusicList();
            break;
        case 'settings-announcement':
            loadAnnouncement();
            break;
        case 'settings-system':
            loadSystemSettings();
            break;
        case 'settings-changelog':
            loadChangelogList();
            break;
    }
}

// ==================== 投稿管理模块 ====================
let globalSubmitData = null;
let globalReasons = [];

// 使用缓存减少重复渲染
let cachedSubmissions = {
    approved: null,
    all: null,
    rejected: null
};

function loadSubmitData() {
    fetch(API_BASE + '?action=get_admin_data')
        .then(res => res.json())
        .then(res => {
            if(res.code === 401) { location.reload(); return; }
            globalSubmitData = res.data;
            
            // 只在数据变化时重新渲染
            if (JSON.stringify(globalSubmitData.submissions) !== JSON.stringify(cachedSubmissions)) {
                cachedSubmissions = {...globalSubmitData.submissions};
                renderSubmitLists();
            }
            // 已移除红点提示功能
        })
        .catch(err => console.error('加载投稿数据失败', err));
    
    loadReasons();
    loadQA();
}

function renderSubmitLists() {
    if (!globalSubmitData) return;
    
    const render = (songs, containerId) => {
        const container = document.getElementById(containerId);
        if (!songs || songs.length === 0) {
            container.innerHTML = '<div style="padding:20px;color:#999;text-align:center;">暂无数据</div>';
            return;
        }
        
        // 使用文档片段优化 DOM 插入
        const fragment = document.createDocumentFragment();
        const tempContainer = document.createElement('ul');
        tempContainer.className = 'data-list';
        
        songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'data-item';
            
            const imgId = `img-${containerId}-${song.id}`;
            const audioId = `audio-${containerId}-${song.id}`;
            
            li.innerHTML = `
                <img id="${imgId}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="封面" style="background:#f0f0f0;">
                <div class="data-info">
                    <h4>${song.name}</h4>
                    <p>${song.artist} - ${song.album} | 投稿：${song.timestamp}</p>
                </div>
                <div class="data-controls">
                    <audio id="${audioId}" controls preload="metadata" style="flex:1;min-width:200px;max-width:100%;">
                        <source src="" type="audio/mpeg">
                    </audio>
                    <button class="btn btn-info btn-small preview-song-btn" data-song-id="${song.id}" data-container-id="${containerId}" style="flex-shrink:0;white-space:nowrap;"><i class="fas fa-play"></i> 试听</button>
                    <button class="btn btn-success btn-small" onclick="pushToSite('${encodeURIComponent(JSON.stringify(song))}')" style="flex-shrink:0;white-space:nowrap;"><i class="fas fa-share-square"></i> 推送</button>
                </div>
            `;
            
            tempContainer.appendChild(li);
        });
        
        container.innerHTML = '';
        while (tempContainer.firstChild) {
            container.appendChild(tempContainer.firstChild);
        }
        
        // 批量懒加载图片
        requestAnimationFrame(() => {
            songs.forEach(song => {
                const imgElem = document.getElementById(`img-${containerId}-${song.id}`);
                if (imgElem) {
                    lazyLoadImage(imgElem, song.picUrl);
                }
            });
        });
    };
    
    render(globalSubmitData.submissions.approved, 'list-approved');
    render(globalSubmitData.submissions.all, 'list-all');
    render(globalSubmitData.submissions.rejected, 'list-rejected');
}

function loadAudioUrls(containerId, songs) {
    // 批量加载，减少延迟时间
    const batchSize = 5;
    for (let i = 0; i < songs.length; i += batchSize) {
        const batch = songs.slice(i, i + batchSize);
        setTimeout(() => {
            batch.forEach(song => {
                const audioElem = document.getElementById(`audio-${containerId}-${song.id}`);
                if (audioElem) {
                    fetch(API_BASE + '?action=music_url&id=' + song.id)
                        .then(res => res.json())
                        .then(data => {
                            if (data.url && audioElem) {
                                audioElem.src = data.url;
                            }
                        })
                        .catch(err => console.error('音频加载失败', err));
                }
            });
        }, i * 200);
    }
}

// ==================== 投稿试听功能 ====================
window.previewAdminSong = function(songId, songName, containerId) {
    console.log('[试听] 正在播放: songId=' + songId + ', containerId=' + containerId);
    
    const audioId = `audio-${containerId}-${songId}`;
    const audioElem = document.getElementById(audioId);
    
    if (!audioElem) {
        alert('找不到音频元素');
        return;
    }
    
    // 如果没有src，需要先获取
    if (!audioElem.src) {
        console.log('[试听] 正在获取音频URL...');
        fetch('/submit/api.php?action=music_url&id=' + songId)
            .then(res => res.json())
            .then(data => {
                console.log('[试听] API响应:', data);
                if (data.url) {
                    audioElem.src = data.url;
                    audioElem.play().catch(err => {
                        console.error('[试听] 播放错误:', err);
                        alert('音频播放失败');
                    });
                } else {
                    alert('API未返回有效URL');
                }
            })
            .catch(err => {
                console.error('[试听] 请求失败:', err);
                alert('获取音频失败: ' + err.message);
            });
    } else {
        // 已经有src，直接播放
        console.log('[试听] 直接播放存储的音频');
        audioElem.play().catch(err => {
            console.error('[试听] 播放错误:', err);
            alert('音频播放失败');
        });
    }
};

function pushToSite(encodedSongStr) {
    if(!confirm("确定将此歌曲推送到网站主页吗？")) return;
    const song = JSON.parse(decodeURIComponent(encodedSongStr));
    
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'push_to_site', song: song })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            alert('✅ 推送成功！已拉取直链并追加到起床铃网页。');
            loadSubmitData();
        } else {
            alert('推送失败：' + data.message);
        }
    })
    .catch(() => alert('网络错误'));
}

// ==================== Q&A 管理 ====================
function loadQA() {
    fetch(API_BASE + '?action=get_qa')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                renderQA(data.qa || []);
            }
        })
        .catch(err => console.error('加载 Q&A 失败', err));
}

function renderQA(qaList) {
    const container = document.getElementById('qa-admin-list');
    if (!qaList || qaList.length === 0) {
        container.innerHTML = '<div style="color:#999;padding:20px;">暂无 Q&A</div>';
        return;
    }
    
    // 使用文档片段优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    qaList.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'background:#f8f9fa;border-left:4px solid var(--primary);padding:15px;margin-bottom:10px;border-radius:4px;';
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="color:var(--primary);font-weight:600;"><i class="fas fa-question"></i> ${item.question}</div>
                <button class="btn btn-danger btn-small" onclick="deleteQA('${item.id}')"><i class="fas fa-trash"></i> 删除</button>
            </div>
            <div style="color:#555;background:white;padding:10px;border-radius:4px;"><i class="fas fa-answer"></i> ${item.answer}</div>
        `;
        
        fragment.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function addQA() {
    const question = document.getElementById('qa-question').value.trim();
    const answer = document.getElementById('qa-answer').value.trim();
    
    if (!question || !answer) return alert('问题和回答不能为空');
    
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'add_qa', question, answer })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Q&A 添加成功！');
            document.getElementById('qa-question').value = '';
            document.getElementById('qa-answer').value = '';
            loadQA();
        } else {
            alert('添加失败：' + data.message);
        }
    })
    .catch(() => alert('网络错误'));
}

function deleteQA(id) {
    if (!confirm('确定删除此 Q&A 吗？')) return;
    
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'delete_qa', id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            loadQA();
        } else {
            alert('删除失败');
        }
    })
    .catch(() => alert('网络错误'));
}

// ==================== 失败原因查询 ====================
function loadReasons() {
    fetch(API_BASE + '?action=get_reasons')
        .then(res => res.json())
        .then(res => {
            if(res.status === 'success') {
                globalReasons = res.data || [];
            }
        })
        .catch(err => console.error('加载失败原因失败', err));
}

// ==================== 反馈管理模块 ====================
// 使用节流减少频繁加载
const throttledLoadFeedbackData = throttle(loadFeedbackData, 2000);

function loadFeedbackData() {
    fetch(API_BASE + '?action=get_admin_data')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const feedbacks = data.data.feedbacks || [];
                renderFeedbacks(feedbacks);
                updateFeedbackStats(feedbacks);
            }
        })
        .catch(err => console.error('加载反馈失败', err));
}

function renderFeedbacks(feedbacks) {
    const container = document.getElementById('feedback-container');
    
    if (feedbacks.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:20px;opacity:0.5;"></i><p>暂无反馈</p></div>';
        return;
    }
    
    // 使用文档片段优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    feedbacks.forEach(f => {
        const typeColors = {
            'bug': '#e74c3c',
            'suggestion': '#3498db',
            'music': '#9b59b6',
            'ui': '#f39c12',
            'other': '#95a5a6'
        };
        
        const typeNames = {
            'bug': '功能异常',
            'suggestion': '功能建议',
            'music': '音乐问题',
            'ui': '界面体验',
            'other': '其他问题'
        };
        
        const div = document.createElement('div');
        div.style.cssText = 'background:white;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin-bottom:15px;transition:0.3s;';
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <span style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:bold;background:${typeColors[f.type] || '#95a5a6'};color:white;">
                        ${typeNames[f.type] || '其他问题'}
                    </span>
                    <span style="color:#999;font-size:13px;"><i class="far fa-clock"></i> ${f.time}</span>
                    ${f.contact ? `<span style="color:var(--primary);font-size:13px;"><i class="fas fa-envelope"></i> ${f.contact}</span>` : ''}
                    <span style="color:${f.status === 'unread' ? 'var(--accent)' : '#999'};font-size:12px;">
                        <i class="fas fa-circle" style="font-size:8px;"></i> ${f.status === 'unread' ? '未读' : '已读'}
                    </span>
                </div>
                <div style="display:flex;gap:10px;">
                    ${f.status === 'unread' ? 
                        `<button class="btn btn-success btn-small" onclick="markFeedbackRead('${f.id}')"><i class="fas fa-check"></i> 标记已读</button>` :
                        `<button class="btn btn-warning btn-small" onclick="markFeedbackUnread('${f.id}')"><i class="fas fa-undo"></i> 标记未读</button>`
                    }
                    <button class="btn btn-danger btn-small" onclick="deleteFeedback('${f.id}')"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>
            <div style="color:#333;line-height:1.6;white-space:pre-wrap;">${f.content}</div>
        `;
        
        fragment.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function updateFeedbackStats(feedbacks) {
    const total = feedbacks.length;
    const unread = feedbacks.filter(f => f.status === 'unread').length;
    const today = feedbacks.filter(f => {
        const feedbackDate = new Date(f.time.replace(' ', 'T'));
        const today = new Date();
        return feedbackDate.toDateString() === today.toDateString();
    }).length;
    
    document.getElementById('feedbackTotal').textContent = total;
    document.getElementById('feedbackUnread').textContent = unread;
    document.getElementById('feedbackToday').textContent = today;
}

function markFeedbackRead(id) {
    updateFeedbackStatus(id, 'read');
}

function markFeedbackUnread(id) {
    updateFeedbackStatus(id, 'unread');
}

function updateFeedbackStatus(id, status) {
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'update_feedback_status', id, status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            loadFeedbackData();
        } else {
            alert('操作失败');
        }
    })
    .catch(() => alert('网络错误'));
}

function deleteFeedback(id) {
    if (!confirm('确定要删除这条反馈吗？')) return;
    
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'delete_feedback', id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            loadFeedbackData();
        } else {
            alert('删除失败');
        }
    })
    .catch(() => alert('网络错误'));
}

// ==================== 投票管理 - 音乐管理 ====================
let musicList = [];

function showAddMusicForm() {
    document.getElementById('music-upload-form').style.display = 'block';
}

function hideAddMusicForm() {
    document.getElementById('music-upload-form').style.display = 'none';
}

function toggleMusicUploadFields() {
    const source = document.getElementById('musicSource').value;
    document.getElementById('local-fields').style.display = source === 'local' ? 'block' : 'none';
    document.getElementById('netease-fields').style.display = source === 'netease' ? 'block' : 'none';
    document.getElementById('qq-fields').style.display = source === 'qq' ? 'block' : 'none';
}

function uploadLocalMusic() {
    const title = document.getElementById('musicTitle').value.trim();
    const fileInput = document.getElementById('musicFile');
    
    if (!title) return alert('请输入歌曲标题');
    if (!fileInput.files[0]) return alert('请选择音频文件');
    
    console.log('[上传] 开始上传音频文件:', title);
    console.log('[上传] 文件名:', fileInput.files[0].name);
    console.log('[上传] 文件大小:', fileInput.files[0].size, 'bytes');
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('audio', fileInput.files[0]);
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
    
    fetch(VOTE_API_BASE + 'music_manager.php', {
        method: 'POST',
        body: formData
    })
    .then(res => {
        console.log('[上传] HTTP 状态码:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('[上传] 服务器响应:', data);
        if (data.success) {
            console.log('[上传] 上传成功，音乐ID:', data.data?.id);
            alert('上传成功！');
            hideAddMusicForm();
            loadMusicList();
            // 同时刷新音频管理列表，确保新上传的文件能立即显示
            console.log('[上传] 刷新音频管理列表...');
            loadAudioFilesList();
            document.getElementById('musicTitle').value = '';
            fileInput.value = '';
        } else {
            console.error('[上传] 上传失败:', data.message);
            alert('上传失败：' + data.message);
        }
    })
    .catch(err => {
        console.error('[上传] 网络错误:', err);
        alert('上传失败：' + err.message);
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> 上传';
    });
}

function addOnlineMusic(platform) {
    const link = platform === 'netease' ? document.getElementById('neteaseLink').value : document.getElementById('qqLink').value;
    
    if (!link) return alert('请输入音乐链接或歌手歌曲名');
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
    
    // 判断是链接还是歌手歌曲名
    const isUrl = link.startsWith('http://') || link.startsWith('https://');
    let bodyData;
    
    if (isUrl) {
        // 如果是链接，使用 music_link 参数
        bodyData = `platform=${platform}&music_link=${encodeURIComponent(link)}&auto_identify=1`;
    } else {
        // 如果是歌手歌曲名，使用 artist_song 参数
        bodyData = `platform=${platform}&artist_song=${encodeURIComponent(link)}&auto_identify=1`;
    }
    
    fetch(VOTE_API_BASE + 'music_api_handler.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: bodyData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('添加成功！');
            hideAddMusicForm();
            loadMusicList();
            if (platform === 'netease') document.getElementById('neteaseLink').value = '';
            else document.getElementById('qqLink').value = '';
        } else {
            alert('添加失败：' + data.message);
        }
    })
    .catch(err => alert('请求失败：' + err.message))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> 添加';
    });
}

function loadMusicList() {
    fetch(VOTE_API_BASE + 'music_manager.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                musicList = data.data || [];
                renderMusicList();
            } else {
                throw new Error(data.message);
            }
        })
        .catch(err => {
            document.getElementById('music-list-container').innerHTML = 
                '<div style="color:red;padding:20px;">加载失败：' + err.message + '</div>';
        });
}

function renderMusicList() {
    const container = document.getElementById('music-list-container');
    
    if (musicList.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">暂无音乐</div>';
        return;
    }
    
    // 使用文档片段优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    musicList.forEach(music => {
        const sourceInfo = music.file ? `本地 | ${music.file}` : `在线 | ${music.source}`;
        const playFn = music.file ? `playLocalMusic('${music.file}')` : `playOnlineMusic('${music.url || ''}')`;
        
        const div = document.createElement('div');
        div.style.cssText = 'background:white;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;';
        
        div.innerHTML = `
            <div>
                <h4 style="margin:0 0 5px 0;color:var(--primary);">${music.title}</h4>
                <p style="margin:0;color:#999;font-size:13px;">ID: ${music.id} | ${sourceInfo}</p>
            </div>
            <div style="display:flex;gap:10px;">
                <button class="btn btn-success btn-small" onclick="${playFn}"><i class="fas fa-play"></i> 播放</button>
                <button class="btn btn-primary btn-small" onclick="editMusic(${music.id})"><i class="fas fa-edit"></i> 编辑</button>
                <button class="btn btn-danger btn-small" onclick="deleteMusic(${music.id})"><i class="fas fa-trash"></i> 删除</button>
            </div>
        `;
        
        fragment.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

window.playLocalMusic = function(file) {
    // 异步加载音频，避免阻塞 UI
    requestAnimationFrame(() => {
        const audio = new Audio('../vote/audio/' + file);
        audio.preload = 'metadata';
        audio.play().catch(err => console.error('播放失败:', err));
    });
};

window.playOnlineMusic = function(url) {
    if (!url) return alert('暂无播放链接');
    // 异步加载音频，避免阻塞 UI
    requestAnimationFrame(() => {
        const audio = new Audio(url);
        audio.preload = 'metadata';
        audio.play().catch(err => console.error('播放失败:', err));
    });
};

window.editMusic = async function(id) {
    const m = musicList.find(i => i.id === id);
    const newTitle = prompt('新标题:', m.title);
    if (newTitle && newTitle.trim() !== m.title) {
        try {
            const res = await fetch(VOTE_API_BASE + 'music_manager.php', {
                method: 'PUT',
                body: JSON.stringify({id, title: newTitle.trim()})
            });
            const data = await res.json();
            if(data.success) {
                alert('更新成功');
                loadMusicList();
            } else {
                throw new Error(data.message);
            }
        } catch(e) {
            alert('更新失败：' + e.message);
        }
    }
};

window.deleteMusic = async function(id) {
    if (!confirm('确定删除？')) return;
    try {
        const res = await fetch(VOTE_API_BASE + 'music_manager.php', {
            method: 'DELETE',
            body: JSON.stringify({id})
        });
        const data = await res.json();
        if(data.success) {
            alert('删除成功');
            loadMusicList();
        } else {
            throw new Error(data.message);
        }
    } catch(e) {
        alert('删除失败：' + e.message);
    }
};

// ==================== 投票管理 - 投票统计 ====================
let voteRecords = [];

function loadVoteRecords() {
    fetch(VOTE_API_BASE + 'get_vote_records.php')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                voteRecords = data.records || [];
                updateVoteStatistics();
                renderVoteRecordsTable();
            }
        })
        .catch(err => console.error('加载投票记录失败', err));
}

function updateVoteStatistics() {
    const today = new Date().toISOString().split('T')[0];
    const ips = new Set();
    const votes = {};
    let todayCount = 0;
    
    voteRecords.forEach(r => {
        ips.add(r.ip);
        if(r.time.startsWith(today)) todayCount++;
        // 按 songId 聚合投票数，累加所有日期的投票
        votes[r.songId] = (votes[r.songId] || 0) + 1;
    });
    
    document.getElementById('totalVotes').textContent = voteRecords.length;
    document.getElementById('uniqueVoters').textContent = ips.size;
    document.getElementById('todayVotes').textContent = todayCount;
    document.getElementById('topSongVotes').textContent = Math.max(...Object.values(votes), 0);
    
    updateSongRanking(votes);
}

function updateSongRanking(votes) {
    // 构建歌曲ID到名称的映射，使用最新的歌曲名称
    const songNameMap = {};
    voteRecords.forEach(r => {
        // 始终更新为最新的歌曲名称（后面的记录会覆盖前面的）
        songNameMap[r.songId] = r.songName;
    });
    
    const sorted = Object.entries(votes).map(([id, n]) => {
        return { 
            name: songNameMap[id] || `ID:${id}`, 
            votes: n, 
            pct: voteRecords.length ? ((n/voteRecords.length)*100).toFixed(1) : 0 
        };
    }).sort((a,b) => b.votes - a.votes);
    
    const tbody = document.getElementById('songRankingBody');
    
    // 使用文档片段优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    sorted.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid #eee;';
        
        tr.innerHTML = `
            <td style="padding:12px;">${i+1}</td>
            <td style="padding:12px;">${s.name}</td>
            <td style="padding:12px;">${s.votes}</td>
            <td style="padding:12px;">${s.pct}%</td>
        `;
        
        fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

function renderVoteRecordsTable() {
    const tbody = document.getElementById('voteRecordsBody');
    const pageRecs = voteRecords.slice(0, 100); // 只显示前 100 条
    
    // 使用文档片段优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    pageRecs.forEach(r => {
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid #eee;';
        
        tr.innerHTML = `
            <td style="padding:12px;">${r.time}</td>
            <td style="padding:12px;">${r.ip}</td>
            <td style="padding:12px;">${r.songId}</td>
            <td style="padding:12px;">${r.songName}</td>
        `;
        
        fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// ==================== 系统重置 ====================
function showResetConfirm() {
    const resetMusic = document.getElementById('resetMusic').checked;
    const resetVotes = document.getElementById('resetVotes').checked;
    const resetSubmit = document.getElementById('resetSubmit')?.checked;
    const resetAudio = document.getElementById('resetAudio')?.checked;
    
    if (!resetMusic && !resetVotes && !resetSubmit && !resetAudio) {
        alert('请至少选择一个重置项');
        return;
    }
    
    const pwd = prompt('请输入管理员密码确认重置：');
    if (!pwd) return;
    
    const options = [];
    if (resetMusic) options.push('music');
    if (resetVotes) options.push('votes');
    if (resetSubmit) options.push('submit');
    if (resetAudio) options.push('audio');
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 重置中...';
    
    fetch(VOTE_API_BASE + 'reset_system.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action:'reset', password:pwd, options:options})
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            let msg = '重置成功！\n\n';
            data.details.forEach(item => {
                msg += '✓ ' + item + '\n';
            });
            alert(msg);
            loadMusicList();
            loadVoteRecords();
        } else {
            alert('重置失败：' + data.message);
        }
    })
    .catch(err => alert('请求失败：' + err.message))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-redo"></i> 执行系统重置';
    });
}

// ==================== 本地音频文件管理 ====================
let audioFilesList = [];

function loadAudioFilesList() {
    const container = document.getElementById('audioFilesList');
    if (!container) {
        console.warn('音频文件列表容器不存在');
        return;
    }
    
    // 显示加载状态
    container.innerHTML = 
        '<div style="text-align:center;padding:30px;color:#999;">' +
        '<i class="fas fa-spinner fa-spin" style="font-size:24px;margin-bottom:10px;"></i>' +
        '<div>正在加载音频文件列表...</div>' +
        '</div>';
    
    fetch(VOTE_API_BASE + 'music_manager.php?action=list_audio_files')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                audioFilesList = data.files || [];
                console.log('音频文件列表加载成功，共', audioFilesList.length, '个文件');
                renderAudioFilesList();
            } else {
                throw new Error(data.message || '加载失败');
            }
        })
        .catch(err => {
            console.error('加载音频文件列表失败', err);
            container.innerHTML = 
                '<div style="text-align:center;padding:30px;color:#c0392b;">' +
                '<i class="fas fa-exclamation-circle" style="font-size:24px;margin-bottom:10px;"></i>' +
                '<div>加载失败：' + err.message + '</div>' +
                '<button onclick="loadAudioFilesList()" style="margin-top:10px;padding:8px 16px;background:var(--primary);color:white;border:none;border-radius:5px;cursor:pointer;">重试</button>' +
                '</div>';
        });
}

function renderAudioFilesList() {
    const container = document.getElementById('audioFilesList');
    if (!container) return;
    
    if (audioFilesList.length === 0) {
        container.innerHTML = 
            '<div style="text-align:center;padding:30px;color:#999;">' +
            '<i class="fas fa-folder-open" style="font-size:3rem;margin-bottom:15px;opacity:0.5;"></i>' +
            '<div>暂无本地音频文件</div>' +
            '<div style="font-size:12px;margin-top:10px;color:#bbb;">请先在“音乐管理”中上传音频文件</div>' +
            '</div>';
        return;
    }
    
    console.log('开始渲染', audioFilesList.length, '个音频文件');
    
    // 使用文档片段优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    audioFilesList.forEach((file, index) => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:center;padding:15px;background:rgba(255, 255, 255, 0.9);border:2px solid rgba(74, 108, 247, 0.1);border-radius:12px;margin-bottom:10px;cursor:pointer;transition:all 0.3s;';
        label.setAttribute('onmouseover', "this.style.background='rgba(74, 108, 247, 0.05)'");
        label.setAttribute('onmouseout', "this.style.background='rgba(255, 255, 255, 0.9)'");
        
        label.innerHTML = `
            <input type="checkbox" class="audio-file-checkbox" value="${file.name}" style="margin-right:15px;transform:scale(1.3);">
            <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                    <strong style="color:var(--text);font-size:15px;">${file.name}</strong>
                    <span style="color:var(--text-light);font-size:13px;">${file.size}</span>
                </div>
                <div style="color:var(--text-light);font-size:13px;">
                    <i class="far fa-clock"></i> ${file.modified} | 
                    <i class="fas fa-music"></i> ID: ${file.id || 'N/A'}
                </div>
            </div>
        `;
        
        fragment.appendChild(label);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    
    console.log('音频文件列表渲染完成');
}

function deleteSelectedAudioFiles() {
    const checkboxes = document.querySelectorAll('.audio-file-checkbox:checked');
    
    if (checkboxes.length === 0) {
        alert('请至少选择一个音频文件');
        return;
    }
    
    const selectedFiles = Array.from(checkboxes).map(cb => cb.value);
    
    if (!confirm(`确定要删除选中的 ${selectedFiles.length} 个音频文件吗？\n\n此操作不可恢复，请谨慎操作！`)) {
        return;
    }
    
    const pwd = prompt('请输入管理员密码确认删除：');
    if (!pwd) return;
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
    
    fetch(VOTE_API_BASE + 'music_manager.php?action=delete_audio_files', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            files: selectedFiles,
            password: pwd
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(`成功删除 ${data.deleted_count || selectedFiles.length} 个文件`);
            loadAudioFilesList();
        } else {
            alert('删除失败：' + data.message);
        }
    })
    .catch(err => alert('删除失败：' + err.message))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-trash"></i> 删除选中的音频文件';
    });
}

// 在加载模块数据时，如果是系统重置页面，则加载音频文件列表
const originalLoadModuleData = loadModuleData;
loadModuleData = function(moduleId) {
    originalLoadModuleData(moduleId);
    if (moduleId === 'vote-reset') {
        // 延迟加载，确保 DOM 已经准备好
        setTimeout(() => {
            console.log('切换到音频管理模块，加载音频文件列表');
            loadAudioFilesList();
        }, 100);
    }
};


// ==================== 歌曲下载管理  ====================
const DOWNLOAD_API = './download_handler.php';

function downloadSongById(internalId) {
    if (!internalId) {
        console.error('无效的歌曲 ID');
        return false;
    }
    //level 可根据需要调整（exhigh / standard / lossless）
    const url = `${DOWNLOAD_API}?id=${internalId}&level=exhigh`;
    window.open(url, '_blank');
    return true;
}

// 单曲下载
window.downloadSingleSong = function(internalId) {
    downloadSongById(internalId);
};

// 批量下载
async function batchDownload(songs, btn) {
    if (!songs.length) {
        alert('没有歌曲可下载');
        return;
    }
    let originalText = '';
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
    }
    let successCount = 0;
    for (let i = 0; i < songs.length; i++) {
        if (btn) {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 触发下载 ${i+1}/${songs.length}`;
        }
        downloadSongById(songs[i].id);
        successCount++;
        if (i < songs.length - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
    alert(`已触发 ${successCount} 个下载，请检查浏览器下载记录。\n若部分未弹出，请允许本站弹窗后重试。`);
}

// 下载全部歌曲
window.downloadAllSongs = async function(event) {
    if (!downloadMusicList.length) {
        alert('没有歌曲');
        return;
    }
    if (!confirm(`确定下载全部 ${downloadMusicList.length} 首吗？`)) return;
    await batchDownload(downloadMusicList, event?.currentTarget);
};

// 下载选中的歌曲
window.downloadSelectedSongs = async function(event) {
    const checkboxes = document.querySelectorAll('.download-music-checkbox:checked');
    if (!checkboxes.length) {
        alert('请至少选择一首歌曲');
        return;
    }
    const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    const selectedSongs = downloadMusicList.filter(s => selectedIds.includes(s.id));
    if (!confirm(`确定下载选中的 ${selectedSongs.length} 首吗？`)) return;
    await batchDownload(selectedSongs, event?.currentTarget);
};

// 加载歌曲列表（从 vote 的 music_manager.php 获取）
window.loadDownloadMusicList = async function() {
    const container = document.getElementById('download-music-list-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:20px;">加载中...</div>';
    try {
        const resp = await fetch(VOTE_API_BASE + 'music_manager.php');
        const data = await resp.json();
        if (!data.success) throw new Error(data.message);
        downloadMusicList = data.data || [];
        renderDownloadList();
    } catch (err) {
        container.innerHTML = `<div style="color:red;padding:20px;">加载失败: ${err.message}<br><button onclick="loadDownloadMusicList()">重试</button></div>`;
    }
};

// 渲染歌曲列表
function renderDownloadList() {
    const container = document.getElementById('download-music-list-container');
    if (!container) return;
    if (downloadMusicList.length === 0) {
        container.innerHTML = '<div style="padding:20px;">暂无歌曲</div>';
        return;
    }
    let html = '';
    downloadMusicList.forEach(music => {
        const title = music.title || `music_${music.id}`;
        html += `
            <label style="display:flex;align-items:center;padding:15px;background:rgba(255,255,255,0.9);border-radius:12px;margin-bottom:10px;cursor:pointer;">
                <input type="checkbox" class="download-music-checkbox" value="${music.id}" style="margin-right:15px;">
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>${escapeHtml(title)}</strong>
                        <button class="btn btn-success btn-small" onclick="event.stopPropagation();downloadSingleSong(${music.id})">
                            <i class="fas fa-download"></i> 下载
                        </button>
                    </div>
                    <div style="font-size:13px;color:#666;">ID: ${music.id}</div>
                </div>
            </label>
        `;
    });
    container.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// 存储歌曲列表（供全选/批量使用）
let downloadMusicList = [];

// 自动初始化（当模块加载时）
if (document.getElementById('download-music-list-container')) {
    loadDownloadMusicList();
}


// ==================== 公告管理 ====================
function loadAnnouncement() {
    // 加载投票页公告
    fetch(VOTE_API_BASE + 'announcement_manager.php')
        .then(res => res.text())
        .then(text => {
            try {
                const data = JSON.parse(text);
                if (data.content) {
                    let txt = data.content;
                    txt = txt.replace(/<br\s*\/?>/gi, '\n');
                    txt = txt.replace(/<\/p>/gi, '\n');
                    txt = txt.replace(/<p>/gi, '');
                    document.getElementById('voteAnnouncementEditor').value = txt.trim();
                }
            } catch(e) {
                console.error('解析投票页公告失败', e);
            }
        })
        .catch(err => console.error('加载投票页公告失败', err));
}

function saveVoteAnnouncement() {
    const rawText = document.getElementById('voteAnnouncementEditor').value;
    if (!rawText) return alert('内容不能为空');
    
    const lines = rawText.split('\n');
    let htmlContent = '';
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine) { 
            htmlContent += `<p>${line}</p>`; 
        } else { 
            htmlContent += `<p></p>`; 
        }
    });
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    fetch(VOTE_API_BASE + 'announcement_manager.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: htmlContent })
    })
    .then(res => res.text())
    .then(text => {
        try {
            const data = JSON.parse(text);
            if (data.success) {
                alert('投票页公告已更新');
            } else {
                alert('保存失败：' + (data.message || '未知错误'));
            }
        } catch(e) {
            alert('后端返回异常：' + text);
        }
    })
    .catch(err => alert('请求错误：' + err.message))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> 保存';
    });
}

// ==================== 系统设置 ====================
function loadSystemSettings() {
    fetch(API_BASE + '?action=get_admin_data')
        .then(res => res.json())
        .then(res => {
            if(res.code === 401) { location.reload(); return; }
            document.getElementById('aiModeToggle').checked = res.data.ai_reason_mode === true;
        })
        .catch(err => console.error('加载设置失败', err));
}

function toggleAiMode(isChecked) {
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'toggle_ai_mode', mode: isChecked })
    })
    .catch(err => console.error('更新 AI 模式失败', err));
}

function clearAllData() {
    if(!confirm("【危险】确定要彻底清空所有投稿数据和反馈记录吗？此操作不可逆！")) return;
    
    const pwd = prompt('请输入管理员密码确认操作：');
    if (!pwd) return;
    
    fetch(API_BASE, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'clear_all_data', password: pwd })
    })
    .then(res => res.json())
    .then(data => {
        if(data.status === 'success') {
            alert('数据已清空');
            loadAllData();
        } else {
            alert('操作失败：' + data.message);
        }
    })
    .catch(() => alert('网络错误'));
}

// ==================== 更新日志管理 ====================
let changelogList = [];

function loadChangelogList() {
    fetch(API_BASE + '?action=get_changelog')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                changelogList = data.data || [];
                renderChangelogList();
            } else {
                throw new Error(data.message || '加载失败');
            }
        })
        .catch(err => {
            console.error('加载更新日志失败', err);
            document.getElementById('changelog-admin-list').innerHTML = 
                '<div style="text-align:center;padding:30px;color:#c0392b;">' +
                '<i class="fas fa-exclamation-circle" style="font-size:24px;margin-bottom:10px;"></i>' +
                '<div>加载失败：' + (err.message || '未知错误') + '</div>' +
                '</div>';
        });
}

function renderChangelogList() {
    const container = document.getElementById('changelog-admin-list');
    
    if (changelogList.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#999;"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:15px;opacity:0.5;"></i><div>暂无更新日志</div></div>';
        return;
    }
    
    const typeColors = {
        'update': '#3498db',
        'fix': '#e74c3c',
        'optimize': '#2ecc71',
        'security': '#f39c12'
    };
    
    const typeNames = {
        'update': '功能更新',
        'fix': '问题修复',
        'optimize': '优化改进',
        'security': '安全更新'
    };
    
    const fragment = document.createDocumentFragment();
    
    changelogList.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'background:white;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin-bottom:15px;transition:0.3s;';
        
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <span style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:bold;background:${typeColors[item.type] || '#95a5a6'};color:white;">
                        ${typeNames[item.type] || item.type || '更新'}
                    </span>
                    <span style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:bold;background:var(--primary);color:white;">
                        ${item.version || 'v1.0'}
                    </span>
                    <span style="color:#999;font-size:13px;"><i class="far fa-calendar"></i> ${item.date || ''}</span>
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn btn-primary btn-small" onclick="editChangelog('${item.id}')"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="btn btn-danger btn-small" onclick="deleteChangelog('${item.id}')"><i class="fas fa-trash"></i> 删除</button>
                </div>
            </div>
            <div style="color:var(--text);font-size:16px;font-weight:600;margin-bottom:10px;">${item.title || '无标题'}</div>
            <div style="color:#555;line-height:1.8;white-space:pre-wrap;font-size:14px;">${item.content || ''}</div>
        `;
        
        fragment.appendChild(div);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function showAddChangelogForm() {
    const modal = document.getElementById('changelog-form-modal');
    const title = modal.querySelector('h3');
    title.innerHTML = '<i class="fas fa-plus"></i> 添加更新日志';
    
    // 重置表单
    document.getElementById('changelog-version').value = '';
    document.getElementById('changelog-title').value = '';
    document.getElementById('changelog-content').value = '';
    document.getElementById('changelog-type').value = 'update';
    document.getElementById('changelog-date').value = new Date().toISOString().split('T')[0];
    
    // 清除编辑模式标记
    document.getElementById('changelog-form-modal').dataset.editId = '';
    
    modal.style.display = 'flex';
}

function editChangelog(id) {
    const item = changelogList.find(c => c.id === id);
    if (!item) {
        alert('未找到该更新日志');
        return;
    }
    
    const modal = document.getElementById('changelog-form-modal');
    const title = modal.querySelector('h3');
    title.innerHTML = '<i class="fas fa-edit"></i> 编辑更新日志';
    
    // 填充表单
    document.getElementById('changelog-version').value = item.version || '';
    document.getElementById('changelog-title').value = item.title || '';
    document.getElementById('changelog-content').value = item.content || '';
    document.getElementById('changelog-type').value = item.type || 'update';
    document.getElementById('changelog-date').value = item.date || new Date().toISOString().split('T')[0];
    
    // 设置编辑模式标记
    modal.dataset.editId = id;
    
    modal.style.display = 'flex';
}

function hideAddChangelogForm() {
    const modal = document.getElementById('changelog-form-modal');
    modal.style.display = 'none';
    
    // 清空表单
    document.getElementById('changelog-version').value = '';
    document.getElementById('changelog-title').value = '';
    document.getElementById('changelog-content').value = '';
    document.getElementById('changelog-type').value = 'update';
}

async function saveChangelog() {
    const version = document.getElementById('changelog-version').value.trim();
    const date = document.getElementById('changelog-date').value;
    const title = document.getElementById('changelog-title').value.trim();
    const type = document.getElementById('changelog-type').value;
    const content = document.getElementById('changelog-content').value.trim();
    
    if (!version) return alert('请输入版本号');
    if (!title) return alert('请输入标题');
    if (!content) return alert('请输入内容');
    
    const pwd = prompt('请输入管理员密码确认保存：');
    if (!pwd) return;
    
    const modal = document.getElementById('changelog-form-modal');
    const editId = modal.dataset.editId;
    
    try {
        let res, data;
        
        if (editId) {
            // 编辑模式
            res = await fetch('../submit/changelog_api.php', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    password: pwd,
                    id: editId,
                    version,
                    date,
                    title,
                    type,
                    content
                })
            });
        } else {
            // 添加模式
            res = await fetch('../submit/changelog_api.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    password: pwd,
                    version,
                    date,
                    title,
                    type,
                    content
                })
            });
        }
        
        data = await res.json();
        
        if (data.success) {
            alert(editId ? '更新日志修改成功！' : '更新日志添加成功！');
            hideAddChangelogForm();
            loadChangelogList();
        } else {
            alert('保存失败：' + data.message);
        }
    } catch (err) {
        alert('网络错误：' + err.message);
    }
}

async function deleteChangelog(id) {
    if (!confirm('确定要删除这条更新日志吗？')) return;
    
    const pwd = prompt('请输入管理员密码确认删除：');
    if (!pwd) return;
    
    try {
        const res = await fetch('../submit/changelog_api.php', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, password: pwd })
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert('删除成功！');
            loadChangelogList();
        } else {
            alert('删除失败：' + data.message);
        }
    } catch (err) {
        alert('网络错误：' + err.message);
    }
}

// ==================== 初始化 ====================
window.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    
    // 移动端优化：防止双击缩放和手势缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 350) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    // 禁用长按菜单
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // 性能优化：使用事件委托处理导航点击
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        // 移动端导航触摸优化
        if (window.innerWidth <= 768) {
            let touchStartX = 0;
            let touchEndX = 0;
            
            sidebar.addEventListener('touchstart', function(e) {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            sidebar.addEventListener('touchend', function(e) {
                touchEndX = e.changedTouches[0].screenX;
                // 检测是否为滑动而非点击
                const diff = Math.abs(touchStartX - touchEndX);
                if (diff > 30) {
                    // 横向滑动，不处理点击
                    return;
                }
            }, { passive: true });
        }
        
        sidebar.addEventListener('click', function(e) {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                // 节流处理，防止快速重复点击
                if (navItem.classList.contains('active')) return;
            }
        });
    }
    
    // 移动端优化：侧边栏导航支持横向滚动
    if (window.innerWidth <= 768) {
        let isDown = false;
        let startX;
        let scrollLeft;
        
        sidebar.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - sidebar.offsetLeft;
            scrollLeft = sidebar.scrollLeft;
        });
        
        sidebar.addEventListener('mouseleave', () => {
            isDown = false;
        });
        
        sidebar.addEventListener('mouseup', () => {
            isDown = false;
        });
        
        sidebar.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - sidebar.offsetLeft;
            const walk = (x - startX) * 2;
            sidebar.scrollLeft = scrollLeft - walk;
        });
    }
    
    // 优化：页面可见性变化时暂停不必要的请求
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // 页面隐藏时，可以暂停一些不必要的操作
            console.log('页面隐藏，暂停部分操作');
        } else {
            // 页面显示时，刷新数据
            console.log('页面显示，刷新数据');
        }
    });
    
    // ==================== 事件处理：试听按钮点击 ====================
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.preview-song-btn');
        if (btn) {
            const songId = btn.getAttribute('data-song-id');
            const containerId = btn.getAttribute('data-container-id');
            console.log('[试听按钮] 被点击, songId=' + songId + ', containerId=' + containerId);
            window.previewAdminSong(songId, '', containerId);
        }
    });
});
