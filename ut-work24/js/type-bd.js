$(function() {

	let isStarted = false;
	let isFinished = false;
	let startTime = null;
	let timeoutTimer = null;
	let clickCount = 0;
	let taskResult = null;

	const clickLogs = [];
	const targetMenu = '고용정책';
	const limitTime = 60 * 1000;

	const $frame = $('#testFrame');

	$('#targetMenuName').text(targetMenu);
	$('#startTest').focus();

	$('#startTest').on('click', function() {

		isStarted = true;
		startTime = Date.now();

		$('#utPage').removeAttr('aria-hidden');

		$('#utOverlay').fadeOut(200, function() {

			$(this).remove();

			$frame.focus();

		});

		timeoutTimer = setTimeout(function() {

			finishFail();

		}, limitTime);

	});

	function saveClick($clicked) {

		var text = $.trim($clicked.text());

		if ($clicked.closest('.lnb').length) {
			text = 'lnb.' + text;
		}

		clickCount++;

		clickLogs.push({
			text: text,
			second: Number(((Date.now() - startTime) / 1000).toFixed(1))
		});

	}

	function makeResult(resultType, $clicked) {

		const endTime = Date.now();

		return {
			targetMenu: targetMenu,
			finalClickMenu: $clicked ? $.trim($clicked.text()) : '',
			failReason: '',
			clickCount: clickCount,
			duration: ((endTime - startTime) / 1000).toFixed(1),
			clickPath: UT.makeClickPath(clickLogs),
			result: resultType,
			startTime: new Date(startTime).toISOString(),
			endTime: new Date(endTime).toISOString(),
			userAgent: navigator.userAgent
		};

	}

	function finishSuccess($clicked) {

		if (isFinished) return;

		isFinished = true;
		clearTimeout(timeoutTimer);

		taskResult = makeResult('success', $clicked);

		$('#successPopup')
			.removeAttr('hidden')
			.hide()
			.fadeIn(200, function() {

				$(this)
					.find('.btn_next')
					.focus();

			});

	}

	function finishFail() {

		if (isFinished) return;

		isFinished = true;
		clearTimeout(timeoutTimer);

		taskResult = makeResult('fail', null);

		$('#failPopup')
			.removeAttr('hidden')
			.hide()
			.fadeIn(200, function() {

				$(this)
					.find('input[name="failReason"]')
					.first()
					.focus();

			});

	}

	$(document).on('click', '.btn_next', function() {

		if (!taskResult) return;

		if (taskResult.result === 'fail') {

			const failReason =
				$('input[name="failReason"]:checked').val();

			if (!failReason) {

				$('#failError').removeAttr('hidden');

				$('input[name="failReason"]')
					.first()
					.focus();

				return;

			}

			$('#failError').attr('hidden', true);

			taskResult.failReason = failReason;

		}

		UT.saveTask(
			'typeBTobe',
			taskResult
		);

		location.href =
			'/ut-work24/group_d/ut-asis-b-cs.html';

	});

	$(document).on('change', 'input[name="failReason"]', function() {

		$('#failError').attr('hidden', true);

	});

	function bindFrameClick() {

		const frame = $frame[0];

		if (
			!frame ||
			!frame.contentWindow ||
			!frame.contentWindow.document
		) {
			return;
		}

		const frameDoc = frame.contentWindow.document;

		$(frameDoc)
			.off('click.utTest')
			.on(
				'click.utTest',
				'a, button',
				function(e) {

					if (
						!isStarted ||
						isFinished
					) {
						return;
					}

					const $clicked = $(this);

					saveClick($clicked);

					if (
						$clicked.attr('data-answer') === 'true'
					) {

						e.preventDefault();

						finishSuccess($clicked);

					}

				}
			);

	}

	var isFrameBound = false;

		function initFrame() {

			if (isFrameBound) return;

			bindFrameClick();

			isFrameBound = true;

		}

		$frame.on('load', function () {

			isFrameBound = false;
			initFrame();

		});

		if ($frame[0].contentDocument?.readyState === 'complete') {

			initFrame();

		}

		setTimeout(function () {

			initFrame();

		}, 500);

		setTimeout(function () {

            initFrame();

        }, 1000);

});