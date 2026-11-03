/* 전체메뉴 UT / B타입 진행상태 추적 */
var UT_B_TRACK = (function ($) {
    'use strict';

    var URL = UT_B_CONFIG.webAppUrl;
    var ID_KEY = 'utAllmenuBSubmissionId';
    var STATE_KEY = 'utAllmenuBTrackStateV6';
    var INTERNAL = false;
    var lastSent = 0;
    var pages = {
        '1_intro.html': '조사 시작',
        '2_survey.html': '참여 전 확인',
        '3_task.html': '과업 안내',
        '4_survey_tobe.html': 'TASK 1 준비',
        '5_survey_subjective.html': '사후 설문',
        '6_upload.html': '결과 제출'
    };

    function getId(create) {
        var value = sessionStorage.getItem(ID_KEY);
        if (!value && create) {
            value = 'B-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            sessionStorage.setItem(ID_KEY, value);
        }
        return value || '';
    }

    function readState() {
        try {
            return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}') || {};
        } catch (error) {
            return {};
        }
    }

    var state = readState();
    state.startedAt = state.startedAt || '';
    state.stage = state.stage || '';
    state.taskStarted = Math.max(0, Math.min(4, Number(state.taskStarted) || 0));
    state.clickCount = Math.max(0, Number(state.clickCount) || 0);
    state.sequence = Math.max(0, Number(state.sequence) || 0);

    function saveState() {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    function savedTasks() {
        if (typeof UT_B !== 'undefined' && typeof UT_B.getTaskResult === 'function') {
            return UT_B.getTaskResult() || {};
        }
        return {};
    }

    var taskKeys = ['toggle', 'task1', 'task2', 'task3'];
    function countStartedTasks() {
        var tasks = savedTasks(), count = state.taskStarted;
        $.each(taskKeys, function (i, key) {
            if (tasks[key] && tasks[key].startTime) count = Math.max(count, i + 1);
        });
        return Math.min(4, count);
    }
    function totalClicks(currentClicks, stage) {
        var tasks = savedTasks(), sum = 0;
        var match = String(stage || '').match(/TASK\s*([1-3])/i);
        var currentKey = /^토글/.test(stage || '') ? 'toggle' : match ? 'task' + match[1] : '';
        $.each(taskKeys, function (_, key) {
            if (tasks[key]) sum += Math.max(0, Number(tasks[key].clickCount) || 0);
        });
        if (currentKey && !tasks[currentKey]) sum += Math.max(0, Number(currentClicks) || 0);
        return Math.max(state.clickCount, sum);
    }

    function send(eventType) {
        var identifier = getId(false);
        if (!identifier) return;

        state.sequence += 1;
        saveState();

        var payload = JSON.stringify({
            action: 'progress',
            groupNo: 'B',
            testType: 'TO-BE',
            submissionId: identifier,
            startedAt: state.startedAt,
            sequence: state.sequence,
            eventType: eventType,
            stage: state.stage,
            task: state.taskStarted,
            taskStarted: state.taskStarted,
            clickCount: state.clickCount,
            userAgent: navigator.userAgent
        });

        var blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon && navigator.sendBeacon(URL, blob)) return;

        // 전송 확인이 불가능한 종료 상황에서는 Beacon을 우선 사용한다.
        $.ajax({
            url: URL,
            method: 'POST',
            data: payload,
            processData: false,
            contentType: 'text/plain;charset=UTF-8',
            crossDomain: true,
            timeout: 6000
        });
    }

    function progress(nextStage, nextTask, nextClicks) {
        if (!getId(false)) return;

        var oldStage = state.stage;
        var previousClicks = state.clickCount;
        var previousTask = state.taskStarted;

        if (typeof nextStage === 'string' && nextStage) state.stage = nextStage;

        // 'TASK N 준비'와 안내 페이지 이동은 과업 시작으로 계산하지 않는다.
        // data-b.js에서 시작 버튼을 누르면 'TASK N 진행'을 전송한다.
        var match = state.stage.match(/TASK\s*([1-3])/i);
        if (match && /(?:진행|완료|제한시간 종료)/.test(state.stage)) {
            state.taskStarted = Math.max(state.taskStarted, Number(match[1]) + 1);
        }
        if (/^토글.*(?:진행|완료|제한시간 종료)/.test(state.stage)) state.taskStarted = Math.max(state.taskStarted, 1);
        state.taskStarted = Math.max(state.taskStarted, countStartedTasks());

        if (nextClicks !== undefined) {
            state.clickCount = totalClicks(nextClicks, state.stage);
        } else {
            state.clickCount = totalClicks(0, state.stage);
        }
        saveState();

        var now = Date.now();
        if (oldStage === state.stage && previousTask === state.taskStarted &&
            previousClicks === state.clickCount && now - lastSent < 2000) return;
        lastSent = now;
        send('progress');
    }

    function navigate(nextStage) {
        // 다음 페이지가 실제로 로드되기 전에는 최종단계를 선반영하지 않는다.
        INTERNAL = true;
    }

    function begin() {
        // 새 조사에서는 기존 참여자 식별자와 진행 수치를 모두 초기화한다.
        sessionStorage.removeItem(STATE_KEY);
        state = {
            startedAt: new Date().toISOString(),
            stage: '조사 시작',
            taskStarted: 0,
            clickCount: 0,
            sequence: 0
        };
        getId(true);
        saveState();
        send('progress');
    }

    $(function () {
        var filename = location.pathname.split('/').pop();
        if (!getId(false)) return;

        if (!state.startedAt) state.startedAt = new Date().toISOString();
        if (filename === '4_survey_tobe.html') {
            var stored = savedTasks();
            var nextTask = 0;
            while (nextTask < 4 && stored[taskKeys[nextTask]]) nextTask++;
            state.stage = nextTask === 0 ? '토글 준비' : 'TASK ' + Math.min(3, nextTask) + ' 준비';
        } else {
            state.stage = pages[filename] || state.stage || filename;
        }
        state.taskStarted = countStartedTasks();
        state.clickCount = totalClicks(0, state.stage);
        saveState();
        send('progress');

        // 숨김, 탭 전환, 최소화는 종료가 아니다.
        setInterval(function () {
            if (getId(false)) send('heartbeat');
        }, 45000);

        $(window).on('pagehide.utBDropout', function () {
            // 새로고침도 pagehide가 발생하므로 서버에서 유예 후 판정한다.
            if (!INTERNAL && getId(false)) send('exit_candidate');
        });
    });

    return {
        begin: begin,
        progress: progress,
        navigate: navigate,
        id: getId
    };
})(jQuery);
