var UT_A = (function () {
    'use strict';

    function saveSurvey(data) {
        sessionStorage.setItem('utSurveyData', JSON.stringify(data));
    }

    function getSurvey() {
        return JSON.parse(sessionStorage.getItem('utSurveyData') || '{}');
    }

    function saveTask(key, data) {
        var taskData = getTaskResult();
        taskData[key] = data;
        sessionStorage.setItem('utTaskResult', JSON.stringify(taskData));
    }

    function getTaskResult() {
        return JSON.parse(sessionStorage.getItem('utTaskResult') || '{}');
    }

    function makeClickPath(clickLogs) {
        return $.map(clickLogs, function (item) {
            return item.text + '[' + item.second + 's]';
        }).join(' > ');
    }

    function clearStorage() {
        sessionStorage.removeItem('utSurveyData');
        sessionStorage.removeItem('utTaskResult');
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