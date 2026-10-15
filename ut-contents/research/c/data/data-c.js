
/* Group C | 취업동향 As-is → To-be 화면 탐색 */
$(function () {
    'use strict';

    var basePath = './research/c/';
    var pageName = location.pathname.split('/').pop();
    var isAsis = pageName === '4_survey_asis.html';
    var isTobe = pageName === '5_survey_tobe.html';

    if (!isAsis && !isTobe) return;

    var taskKey = isAsis ? 'typeCAsis' : 'typeCTobe';
    var nextPage = basePath + (isAsis ? '5_survey_tobe.html' : '6_survey-subjective.html');
    var targetMenu = '취업동향 모아보기';
    var limitTime = 60000;

    var $page = $('#utPage');
    var $frame = $('#testFrame');
    var $intro = $('#utOverlay');
    var $success = $('#successPopup');
    var $fail = $('#failPopup');
    var $startButton = $('#startTest');

    var started = false;
    var finished = false;
    var frameReady = false;
    var navigating = false;
    var startTime = 0;
    var lastClickTime = 0;
    var timer = null;
    var clickLogs = [];
    var result = null;
    var activeDialog = $intro;

    if (!$frame.length || typeof UT_C === 'undefined') return;

    function cleanText(text) {
        return String(text == null ? '' : text)
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    function getControlName($control) {
        var name = $control.attr('aria-label');
        var labelledby = $control.attr('aria-labelledby');

        if (!name && labelledby) {
            var doc = $control[0].ownerDocument;
            var names = $.map(labelledby.split(/\s+/), function (id) {
                var label = doc.getElementById(id);
                return label ? label.textContent : '';
            });
            name = names.join(' ');
        }

        if (!name) name = $control.text();
        if (!cleanText(name)) name = $control.find('img[alt]').first().attr('alt');
        if (!cleanText(name)) name = $control.attr('title');

        return cleanText(name) || '(이름 없는 메뉴)';
    }

    function setPageBlocked(blocked) {
        $page.prop('inert', blocked);

        if (blocked) {
            $page.attr('aria-hidden', 'true');
            $frame.attr('tabindex', '-1');
        } else {
            $page.removeAttr('aria-hidden');
            $frame.removeAttr('tabindex');
        }
    }

    function openResultDialog($dialog, focusSelector) {
        setPageBlocked(true);
        activeDialog = $dialog;

        $dialog
            .prop('hidden', false)
            .stop(true, true)
            .hide()
            .fadeIn(200, function () {
                $(this)
                    .find(focusSelector)
                    .first()
                    .trigger('focus');
            });
    }

    // 모달 내부 포커스 순환
    $(document).on('keydown.utC', function (e) {
        if (!activeDialog || e.which !== 9) return;

        var $items = activeDialog.find(
            'a[href], button:not(:disabled), input:not(:disabled), ' +
            'select:not(:disabled), textarea:not(:disabled), ' +
            '[tabindex]:not([tabindex="-1"])'
        ).filter(':visible');

        if (!$items.length) {
            e.preventDefault();
            activeDialog
                .attr('tabindex', '-1')
                .trigger('focus');
            return;
        }

        var first = $items[0];
        var last = $items[$items.length - 1];
        var current = document.activeElement;

        if (
            e.shiftKey &&
            (current === first || !$.contains(activeDialog[0], current))
        ) {
            e.preventDefault();
            $(last).trigger('focus');
        } else if (
            !e.shiftKey &&
            (current === last || !$.contains(activeDialog[0], current))
        ) {
            e.preventDefault();
            $(first).trigger('focus');
        }
    });

    function makeResult(status, finalClickMenu) {
        var endTime = Date.now();

        return {
            targetMenu: targetMenu,
            finalClickMenu: finalClickMenu || '',
            failReason: '',
            clickCount: clickLogs.length,
            duration: Math.round((endTime - startTime) / 1000),
            clickPath: UT_C.makeClickPath(clickLogs),
            result: status,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            userAgent: navigator.userAgent
        };
    }

    function finishSuccess(name) {
        if (!started || finished) return;

        finished = true;
        clearTimeout(timer);

        result = makeResult('success', name);

        UT_C.saveTask(taskKey, result);

        openResultDialog($success, '.btn_next');
    }

    function finishFail() {
        if (!started || finished) return;

        finished = true;
        clearTimeout(timer);

        result = makeResult('fail', '');

        openResultDialog($fail, 'input[name="failReason"]');
    }

    function bindFrameClicks() {
        var frame = $frame[0];
        var doc;

        try {
            doc = frame.contentDocument || frame.contentWindow.document;
        } catch (e) {
            frameReady = false;
            return false;
        }

        if (!doc || doc.readyState === 'loading') return false;

        $(doc)
            .off('click.utC', 'a, button')
            .on('click.utC', 'a, button', function (e) {
                if (!started || finished) return;

                var $control = $(this);
                var name = getControlName($control);
                var now = Date.now();

                // 직전 클릭부터 현재 클릭까지의 개별 소요시간
                var elapsed = Math.round(
                    (now - lastClickTime) / 100
                ) / 10;

                lastClickTime = now;

                clickLogs.push({
                    text: name,
                    second: elapsed
                });

                // 정답 메뉴 판정
                if ($control.attr('data-answer') === 'true') {
                    e.preventDefault();
                    finishSuccess(name);
                }
            });

        frameReady = true;
        $startButton.prop('disabled', false);

        if (
            !started &&
            activeDialog &&
            activeDialog[0] === $intro[0]
        ) {
            $startButton.trigger('focus');
        }

        return true;
    }

    // 초기 설정
    $success.hide();
    $fail.hide();

    $('#targetMenuName').text(targetMenu);

    $startButton.prop('disabled', true);
    setPageBlocked(true);

    $('#utOverlayTitle')
        .attr('tabindex', '-1')
        .trigger('focus');

    // iframe 로드 후 이벤트 연결
    $frame.on('load.utC', function () {
        bindFrameClicks();
    });

    // 이미 iframe 로드가 완료된 경우
    try {
        if (
            $frame[0].contentDocument &&
            $frame[0].contentDocument.readyState === 'complete'
        ) {
            bindFrameClicks();
        }
    } catch (e) {
        frameReady = false;
    }

    // 테스트 시작
    $startButton.on('click.utC', function () {
        if (started || !frameReady) return;

        started = true;

        startTime = Date.now();
        lastClickTime = startTime;

        timer = setTimeout(finishFail, limitTime);

        $intro
            .stop(true, true)
            .fadeOut(200, function () {
                $(this).prop('hidden', true);

                activeDialog = null;
                setPageBlocked(false);

                $frame.trigger('focus');
            });
    });

    // 다음 페이지 이동
    $success.add($fail)
        .find('.btn_next')
        .on('click.utC', function () {
            if (!result || navigating) return;

            if (result.result === 'fail') {
                var $reason = $fail.find(
                    'input[name="failReason"]:checked'
                );

                if (!$reason.length) {
                    $fail
                        .find('input[name="failReason"]')
                        .first()
                        .trigger('focus');
                    return;
                }

                result.failReason = $reason.val();

                UT_C.saveTask(taskKey, result);
            }

            navigating = true;
            location.href = nextPage;
        });
});
