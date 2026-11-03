/* A타입 이탈 후보 감지: 조사 페이지 전용. iframe/CSS/전체메뉴 스크립트 변경 없음. */
var UT_A_TRACK = (function ($) {
    'use strict';
    var URL = 'https://script.google.com/macros/s/AKfycbxYCfQUeMtC8NAk8WiZZ3Bx8fP42gAETB5JDcqCdrvFyFfD7PeHywL616_bUddPhE9_/exec';
    var KEY = 'utAllmenuASubmissionId';
    var INTERNAL = false;
    var stage = '';
    var taskNo = '';
    var clickCount = 0;
    var lastProgressSent = 0;
    var pageNames = {
        '1_intro.html':'조사 시작', '2_survey.html':'참여 전 확인',
        '3_task.html':'과업 안내', '4_survey_asis.html':'TASK 1',
        '6_survey_subjective.html':'사후 설문', '7_upload.html':'결과 제출'
    };

    function id(create) {
        var existing = sessionStorage.getItem(KEY);
        if (!existing && create) {
            existing = 'A-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            sessionStorage.setItem(KEY, existing);
        }
        return existing || '';
    }
    function send(eventType) {
        var identifier = id(false);
        if (!identifier || !URL) return;
        var payload = JSON.stringify({
            action: 'progress', groupNo: 'A', testType: 'AS-IS',
            submissionId: identifier, eventType: eventType,
            stage: stage, task: taskNo, clickCount: clickCount,
            userAgent: navigator.userAgent
        });
        var data = new Blob([payload], {type:'text/plain;charset=UTF-8'});
        if (navigator.sendBeacon && navigator.sendBeacon(URL, data)) return;
        // 종료 시 통신 실패 가능. 그 경우 다음 기록과 서버 미활동 판정으로 보완.
        $.ajax({url:URL, method:'POST', data:payload,
            processData:false, contentType:'text/plain;charset=UTF-8',
            crossDomain:true, timeout:6000});
    }
    function progress(nextStage, nextTask, nextClicks) {
        var sameStage = nextStage === stage;
        if (typeof nextStage === 'string' && nextStage) stage = nextStage;
        if (nextTask !== undefined) taskNo = nextTask;
        if (nextClicks !== undefined) clickCount = nextClicks;
        // 같은 단계에서 연속 클릭 시 Apps Script 요청 과다 발생 방지.
        var now = Date.now();
        if (sameStage && now - lastProgressSent < 2000) return;
        lastProgressSent = now;
        send('progress');
    }
    function navigate(nextStage) {
        INTERNAL = true;
        progress(nextStage);
    }
    function begin() {
        id(true);
        progress('조사 시작', '', 0);
    }
    $(function () {
        var filename = location.pathname.split('/').pop();
        stage = pageNames[filename] || filename;
        if (id(false)) send('progress');
        // 탭 전환/최소화는 종료로 간주하지 않는다.
        setInterval(function () { if (id(false)) send('heartbeat'); }, 45000);
        $(window).on('pagehide.utADropout', function () {
            // 조사 자체의 정상적인 다음 페이지 이동은 이탈 후보에서 제외.
            if (!INTERNAL && id(false)) send('exit_candidate');
        });
    });
    return {begin:begin, progress:progress, navigate:navigate, id:id};
})(jQuery);
