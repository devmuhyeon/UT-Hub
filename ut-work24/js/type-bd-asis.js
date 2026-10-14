$(function() {

	let isStarted = false;
	let startTime = null;
	let timeoutTimer = null;

	const limitTime = 60 * 1000;
	const targetMenu = '고용정책';

	const startTimeKey = 'bTypeStartTime';
	const timeoutKey = 'bTypeAsisTimeout';

	$('#targetMenuName').text(targetMenu);
	$('#startTest').focus();

	function getStartTime() {
		return Number(sessionStorage.getItem(startTimeKey));
	}

	function getElapsedTime() {
		const savedStartTime = getStartTime();

		if (!savedStartTime) {
			return 0;
		}

		return Date.now() - savedStartTime;
	}

	function getRemainTime() {
		return limitTime - getElapsedTime();
	}

	function goTimeoutPage() {
		if (sessionStorage.getItem(timeoutKey) === 'Y') {
			return;
		}

		sessionStorage.setItem(timeoutKey, 'Y');

		location.href =
			'/ut-work24/group_d/ut-asis-b.html?timeout=true';
	}

	function startLimitTimer() {
		const remainTime = getRemainTime();

		clearTimeout(timeoutTimer);

		if (remainTime <= 0) {
			goTimeoutPage();
			return;
		}

		timeoutTimer = setTimeout(function() {
			goTimeoutPage();
		}, remainTime);
	}

	$('#startTest').on('click', function() {

		isStarted = true;
		startTime = Date.now();

		sessionStorage.setItem(
			startTimeKey,
			startTime
		);

		sessionStorage.removeItem(timeoutKey);

		$('#utPage').removeAttr('aria-hidden');

		$('#utOverlay').fadeOut(200, function() {

			$(this).remove();

		});

		startLimitTimer();

	});

	const $frame = $('#testFrame');

	$frame.on('load', function() {

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
			.off('click.utStart')
			.on(
				'click.utStart',
				'a, button',
				function(e) {

					if (!isStarted) return;

					const text =
						$.trim($(this).text());

					if (
						text.indexOf('고용정책') > -1
					) {

						e.preventDefault();

						clearTimeout(timeoutTimer);

						location.href =
							'/ut-work24/group_d/ut-asis-b.html';

					}

				}
			);

	});

});