/* Group B | 고용정책 TO-BE(GNB) → AS-IS(고객센터) */
$(function () {
    'use strict';

    var basePath = '/UT-Hub/ut-contents/research/b/';
    var frameBase = '/UT-Hub/ut-contents/source/frame/';
    var pageName = location.pathname.split('/').pop();
    var isAsis = pageName === '5_survey_asis.html';
    var isTobe = pageName === '4_survey_tobe.html';
    if (!isAsis && !isTobe) return;

    var taskKey = isTobe ? 'typeBTobe' : 'typeBAsis';
    var nextPage = basePath + (isTobe ? '5_survey_asis.html' : '6_survey_subjective.html');
    var progressKey = 'utBAsisProgress';
    var targetMenu = '고용정책';
    var limitTime = 60000;

    var $page = $('#utPage');
    var $frame = $('#testFrame');
    var $intro = $('#utOverlay');
    var $success = $('#successPopup');
    var $fail = $('#failPopup');
    var $startButton = $('#startTest');

    var started = false;
    var finished = false;
    var navigating = false;
    var frameReady = false;
    var startTime = 0;
    var lastClickTime = 0;
    var timer = null;
    var clickLogs = [];
    var result = null;
    var lastMenu = '';
    var activeDialog = $intro;

    if (!$frame.length || typeof UT_B === 'undefined') return;

    function cleanText(value) {
        return String(value == null ? '' : value).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    }

    function getControlName($control) {
        var name = $control.attr('aria-label');
        var labelledby = $control.attr('aria-labelledby');

        if (!name && labelledby) {
            var doc = $control[0].ownerDocument;
            name = $.map(labelledby.split(/\s+/), function (id) {
                var node = doc.getElementById(id);
                return node ? node.textContent : '';
            }).join(' ');
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

    function setDialog($dialog, focusSelector) {
        setPageBlocked(true);
        activeDialog = $dialog;
        $dialog.prop('hidden', false).stop(true, true).hide().fadeIn(200, function () {
            $(this).find(focusSelector).first().trigger('focus');
        });
    }

    // Dialog focus stays inside whichever test popup is open.
    $(document).on('keydown.utB', function (e) {
        if (!activeDialog || e.which !== 9) return;
        var $items = activeDialog.find(
            'a[href],button:not(:disabled),input:not(:disabled),' +
            'select:not(:disabled),textarea:not(:disabled),' +
            '[tabindex]:not([tabindex="-1"])'
        ).filter(':visible');
        if (!$items.length) {
            e.preventDefault();
            activeDialog.attr('tabindex', '-1').trigger('focus');
            return;
        }
        var first = $items[0];
        var last = $items[$items.length - 1];
        var focused = document.activeElement;
        if (e.shiftKey && (focused === first || !$.contains(activeDialog[0], focused))) {
            e.preventDefault();
            $(last).trigger('focus');
        } else if (!e.shiftKey && (focused === last || !$.contains(activeDialog[0], focused))) {
            e.preventDefault();
            $(first).trigger('focus');
        }
    });

    function persistProgress() {
        if (!isAsis || !started || finished) return;
        sessionStorage.setItem(progressKey, JSON.stringify({
            startTime: startTime,
            lastClickTime: lastClickTime,
            clickLogs: clickLogs,
            lastMenu: lastMenu
        }));
    }

    function makeResult(status, finalClickMenu) {
        var endTime = Date.now();
        return {
            groupNo: 'B',
            targetMenu: targetMenu,
            targetMenu1: isAsis ? targetMenu : '',
            targetMenu2: isTobe ? targetMenu : '',
            finalClickMenu: finalClickMenu || lastMenu || '',
            failReason: '',
            clickCount: clickLogs.length,
            duration: Math.round((endTime - startTime) / 1000),
            clickPath: UT_B.makeClickPath(clickLogs),
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
        UT_B.saveTask(taskKey, result);
        if (isAsis) sessionStorage.removeItem(progressKey);
        setDialog($success, '.btn_next');
    }

    function finishFail() {
        if (!started || finished) return;
        finished = true;
        clearTimeout(timer);
        result = makeResult('fail', lastMenu);
        if (isAsis) sessionStorage.removeItem(progressKey);
        setDialog($fail, 'input[name="failReason"]');
    }

    function logClick($control) {
        var now = Date.now();
        var name = getControlName($control);
        var pathName = $control.closest('.lnb').length ? 'lnb.' + name : name;
        clickLogs.push({
            text: pathName,
            second: Math.round((now - lastClickTime) / 100) / 10
        });
        lastMenu = name;
        lastClickTime = now;
        persistProgress();
        return name;
    }

    function bindFrameClicks() {
        var doc;
        try {
            doc = $frame[0].contentDocument || $frame[0].contentWindow.document;
        } catch (e) {
            // Cross-origin pages cannot be measured. The test never intentionally leaves our origin.
            frameReady = false;
            return false;
        }
        if (!doc || doc.readyState === 'loading') return false;
        $(doc).off('click.utB', 'a,button').on('click.utB', 'a,button', function (e) {
            if (!started || finished) return;
            var $control = $(this);
            var name = logClick($control);

            // Correctness is not decided from text matching: promotional links
            // and other sections also contain the word 고용정책.
            if ($control.attr('data-answer') === 'true') {
                e.preventDefault();
                finishSuccess(name);
                return;
            }

            // Keep the AS-IS customer-center transition *inside the iframe*.
            // Parent wrapper, click count, progress and deadline must survive.
            if (isAsis && $control.attr('data-ut-route') === 'customer') {
                e.preventDefault();
                $frame.attr('src', frameBase + 'employment_policy_asis_cs.html');
            }
        });
        frameReady = true;
        if (!started) $startButton.prop('disabled', false);
        return true;
    }

    $success.hide();
    $fail.hide();
    $('#targetMenuName').text(targetMenu);
    setPageBlocked(true);
    $startButton.prop('disabled', true);
    $('#utOverlayTitle').attr('tabindex', '-1').trigger('focus');

    // Load the test frame (and rebind when it navigates to customer center).
    $frame.on('load.utB', function () {
        bindFrameClicks();
    });
    try {
        if ($frame[0].contentDocument && $frame[0].contentDocument.readyState === 'complete') {
            bindFrameClicks();
        }
    } catch (e) { frameReady = false; }

    $startButton.on('click.utB', function () {
        if (started || !frameReady) return;
        started = true;
        startTime = Date.now();
        lastClickTime = startTime;
        persistProgress();
        timer = setTimeout(finishFail, limitTime);
        $intro.stop(true, true).fadeOut(200, function () {
            $(this).prop('hidden', true);
            activeDialog = null;
            setPageBlocked(false);
            $frame.trigger('focus');
        });
    });

    $success.add($fail).find('.btn_next').on('click.utB', function () {
        if (!result || navigating) return;
        if (result.result === 'fail') {
            var $reason = $fail.find('input[name="failReason"]:checked');
            if (!$reason.length) {
                $('#failError').prop('hidden', false);
                $fail.find('input[name="failReason"]').first().trigger('focus');
                return;
            }
            result.failReason = $reason.val();
            UT_B.saveTask(taskKey, result);
        }
        navigating = true;
        location.href = nextPage;
    });
    $fail.find('input[name="failReason"]').on('change.utB', function () {
        $('#failError').prop('hidden', true);
    });
});
