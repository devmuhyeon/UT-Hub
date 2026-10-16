
/* Group B | 설문 및 화면 탐색 결과 임시 저장 */
var UT_B = (function () {
    'use strict';

    var surveyKey = 'utBSurveyData';
    var taskKey = 'utBTaskResult';

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
            return item.text + '[' + item.second + 's]';
        }).join(' > ');
    }

    function clearStorage() {
        sessionStorage.removeItem(surveyKey);
        sessionStorage.removeItem(taskKey);
    }

    return {
        saveSurvey: saveSurvey,
        getSurvey: getSurvey,
        saveTask: saveTask,
        getTaskResult: getTaskResult,
        makeClickPath: makeClickPath,
        clearStorage: clearStorage
    };
})();
