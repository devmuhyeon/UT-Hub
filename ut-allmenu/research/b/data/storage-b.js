
/* Group B | 설문 및 화면 탐색 결과 임시 저장 */
var UT_B = (function () {
    'use strict';

    var surveyKey = 'utAllmenuBSurveyData';
    var taskKey = 'utAllmenuBTaskResult';

    function read(key) {
        try {
            var value = JSON.parse(sessionStorage.getItem(key) || '{}');

            return value && typeof value === 'object' && !Array.isArray(value)
                ? value
                : {};
        } catch (e) {
            return {};
        }
    }

    function saveSurvey(data) {
        sessionStorage.setItem(surveyKey, JSON.stringify(data));
    }

    function getSurvey() {
        return read(surveyKey);
    }

    function saveTask(key, data) {
        var tasks = getTaskResult();

        tasks[key] = data;

        sessionStorage.setItem(taskKey, JSON.stringify(tasks));
    }

    function getTaskResult() {
        return read(taskKey);
    }

    function makeClickPath(logs) {
        return $.map(logs, function (item) {
            return item.text + ' [' + Number(item.second).toFixed(1) + 's]';
        }).join(' > ');
    }

    function clearStorage() {
        sessionStorage.removeItem(surveyKey);
        sessionStorage.removeItem(taskKey);
    }

    // 두 번의 결과 전송에 같은 참여자 ID를 사용한다. 추적 통신은 하지 않는다.
    function getSubmissionId() {
        var key = 'utAllmenuBSubmissionId';
        var id = sessionStorage.getItem(key);
        if (!id) {
            id = 'B-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            sessionStorage.setItem(key, id);
        }
        return id;
    }

    function post(data) {
        // 단순 POST로 전송한다. CORS 응답 실패와 저장 실패는 다르므로
        // 업로드 화면의 JSONP 상태 조회로 실제 저장 여부를 확인한다.
        return $.ajax({
            url: UT_B_CONFIG.webAppUrl,
            method: 'POST',
            data: JSON.stringify(data),
            processData: false,
            contentType: 'text/plain;charset=UTF-8',
            dataType: 'text',
            crossDomain: true,
            global: false,
            timeout: 15000
        });
    }

    return {
        getSubmissionId: getSubmissionId,
        post: post,
        saveSurvey: saveSurvey,
        getSurvey: getSurvey,
        saveTask: saveTask,
        getTaskResult: getTaskResult,
        makeClickPath: makeClickPath,
        clearStorage: clearStorage
    };
})();
