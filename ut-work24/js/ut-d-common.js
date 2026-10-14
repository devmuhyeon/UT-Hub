var UT = (function () {
	'use strict';

	function saveSurvey(data) {
		sessionStorage.setItem(
			'utSurveyData',
			JSON.stringify(data)
		);
	}

	function getSurvey() {

		var data =
			sessionStorage.getItem('utSurveyData');

		try {

			return JSON.parse(data || '{}');

		} catch (e) {

			return {};

		}

	}

	function saveTask(key, data) {

		var taskData = getTaskResult();

		taskData[key] = data;

		sessionStorage.setItem(
			'utTaskResult',
			JSON.stringify(taskData)
		);

	}

	function getTaskResult() {

		var savedData =
			sessionStorage.getItem('utTaskResult');

		var parsedData = {};

		try {

			parsedData =
				JSON.parse(savedData || '{}');

		} catch (e) {

			parsedData = {};

		}

		if (
			!parsedData ||
			typeof parsedData !== 'object' ||
			Array.isArray(parsedData)
		) {

			parsedData = {};

		}

		return parsedData;

	}

	function makeClickPath(clickLogs) {

		return $.map(clickLogs, function (item) {

			return (
				item.text +
				'[' +
				item.second +
				's]'
			);

		}).join(' > ');

	}

	function clearStorage() {

		sessionStorage.removeItem('utSurveyData');
		sessionStorage.removeItem('utTaskResult');
		sessionStorage.removeItem('utCoSurvey');
		sessionStorage.removeItem('utFinalResult');
		sessionStorage.removeItem('ut_group');
		sessionStorage.removeItem('user_ut_id');
		sessionStorage.removeItem('b_start');
		sessionStorage.removeItem('bTypeStartTime');
		sessionStorage.removeItem('ut_upload_sent');

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