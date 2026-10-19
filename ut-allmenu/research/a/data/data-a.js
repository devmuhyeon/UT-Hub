/* Group A | 전체메뉴 AS-IS → TO-BE */
$(function () {
    'use strict';

    var basePath = '/UT-Hub/ut-allmenu/research/a/';
    var pageName = location.pathname.split('/').pop();
    var isAsis = pageName === '4_survey_asis.html';
    var isTobe = pageName === '5_survey_tobe.html';
    if (!isAsis && !isTobe) return;

    var taskKey = isAsis ? 'typeAAsis' : 'typeATobe';
    var nextPage = basePath + (isAsis ? '5_survey_tobe.html' : '6_survey_subjective.html');
    var progressKey = 'utAAsisProgress';
    // 각 화면의 목표 메뉴는 독립적으로 설정합니다.
    var taskConfig = {
        asis: { targetMenu: '사이트 소개', section: '고객센터' },
        tobe: { targetMenu: '채용정보 상세검색', section: '채용정보' }
    };
    var config = isAsis ? taskConfig.asis : taskConfig.tobe;
    var targetMenu = config.targetMenu;
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

    if (!$frame.length || typeof UT_A === 'undefined') return;

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
    $(document).on('keydown.utA', function (e) {
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
            groupNo: 'A',
            targetMenu: targetMenu,
            targetMenu1: isAsis ? targetMenu : '',
            targetMenu2: isTobe ? targetMenu : '',
            finalClickMenu: finalClickMenu || lastMenu || '',
            failReason: '',
            clickCount: clickLogs.length,
            duration: Math.min(
                Math.round((endTime - startTime) / 1000),
                limitTime / 1000
            ),
            clickPath: UT_A.makeClickPath(clickLogs),
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
        UT_A.saveTask(taskKey, result);
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

    function getMenuDepth($control) {
        // TO-BE의 구조가 다르면 해당 a/button에 data-depth="1"~"4" 지정.
        var explicit = $control.attr('data-depth');
        if (/^[1-4]$/.test(explicit || '')) return Number(explicit);
        if ($control.closest('.menuLevel4').length) return 4;
        if ($control.closest('.site_map').length) return 3;
        if ($control.closest('.menu_tit').length) return 2;
        if ($control.closest('.tab_title').length) return 1;
        return 0;
    }

    function isAnswer($control, name) {
        if (name !== targetMenu) return false;
        // 화면 구조가 달라도 명시적으로 지정한 정답 요소 사용 가능.
        if ($control.attr('data-answer') === 'true') return true;
        var section = cleanText(
            $control.closest('.site_map_div').find('.menu_info_header h5').first().text()
        );
        return getMenuDepth($control) >= 2 && section === config.section;
    }

    function logClick($control) {
        var now = Date.now();
        var name = getControlName($control);
        var depth = getMenuDepth($control);
        var pathName = (depth ? depth + 'dp_' : '') + name;
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
        if (!$(doc).find('#sitemappopup').length) {
            frameReady = false;
            $startButton.prop('disabled', true);
            $('#utFrameError').remove();
            $('<p id="utFrameError" role="alert"></p>')
                .text('전체메뉴 화면을 불러오지 못했습니다. 화면 파일 연결을 확인해 주세요.')
                .insertBefore($startButton);
            return false;
        }
        $('#utFrameError').remove();
        $(doc).off('click.utA', 'a,button').on('click.utA', 'a,button', function (e) {
            if (!started || finished) return;
            var $control = $(this);
            var name = logClick($control);

            // 링크 이동은 차단하되 전체메뉴 펼침·탭 동작은 유지합니다.
            e.preventDefault();
            if (isAnswer($control, name)) {
                finishSuccess(name);
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

    // 프레임 로드 후 메뉴 클릭 기록 연결.
    $frame.on('load.utA', function () {
        bindFrameClicks();
    });
    try {
        if ($frame[0].contentDocument && $frame[0].contentDocument.readyState === 'complete') {
            bindFrameClicks();
        }
    } catch (e) { frameReady = false; }

    $startButton.on('click.utA', function () {
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

    $success.add($fail).find('.btn_next').on('click.utA', function () {
        if (!result || navigating) return;
        if (result.result === 'fail') {
            var $reason = $fail.find('input[name="failReason"]:checked');
            if (!$reason.length) {
                $('#failError').prop('hidden', false);
                $fail.find('input[name="failReason"]').first().trigger('focus');
                return;
            }
            result.failReason = $reason.val();
            UT_A.saveTask(taskKey, result);
        }
        navigating = true;
        location.href = nextPage;
    });
    $fail.find('input[name="failReason"]').on('change.utA', function () {
        $('#failError').prop('hidden', true);
    });
});
