$(function () {

    var isStarted = false;
    var isFinished = false;
    var startTime = null;
    var lastClickTime = null;
    var timeoutTimer = null;
    var clickCount = 0;
    var taskResult = null;

    var clickLogs = [];
    var targetMenu = '취업동향 모아보기';
    var limitTime = 60 * 1000;

    var $frame = $('#testFrame');

    $('#targetMenuName').text(targetMenu);
    $('#startTest').focus();

    function getCurrentTypeKey() {

        var currentPage = location.pathname.split('/').pop();

        if (currentPage === 'ut-asis-a.html') {
            return 'typeAAsis';
        }

        if (currentPage === 'ut-tobe-a.html') {
            return 'typeATobe';
        }

        return '';

    }

    function goNextPage() {

        var currentPage = location.pathname.split('/').pop();

        if (currentPage === 'ut-asis-a.html') {

            location.href = '/ut-work24/group_a/ut-tobe-a.html';

            return;
        }

        if (currentPage === 'ut-tobe-a.html') {

            location.href = '/ut-work24/group_a/co-survey.html';

            return;
        }

    }

    function cleanText(text) {

        return $.trim(text).replace(/\s+/g, ' ');

    }

    function getSecond(ms) {

        return Math.round((ms / 1000) * 10) / 10;

    }

    function saveClick($clicked) {

        var now = Date.now();

        var totalSecond = getSecond(now - startTime);

        clickCount++;

        clickLogs.push({
            text: cleanText($clicked.text()),
            second: totalSecond
        });

    }

    function makeResult(resultType, $clicked) {

        var endTime = Date.now();

        return {
            targetMenu: targetMenu,
            finalClickMenu: $clicked ? cleanText($clicked.text()) : '',
            failReason: '',
            clickCount: clickCount,
            duration: Math.round((endTime - startTime) / 1000),
            clickPath: UT_A.makeClickPath(clickLogs),
            result: resultType,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            userAgent: navigator.userAgent
        };

    }

    function saveCurrentTask(result) {

        var key = getCurrentTypeKey();

        if (!key) return;

        UT_A.saveTask(key, result);

    }

    $('#startTest').on('click', function () {

        isStarted = true;

        startTime = Date.now();

        lastClickTime = startTime;

        $('#utPage').removeAttr('aria-hidden');

        $('#utOverlay').fadeOut(200, function () {

            $(this).remove();

            $frame.focus();

        });

        timeoutTimer = setTimeout(function () {

            finishFail();

        }, limitTime);

    });

    function finishSuccess($clicked) {

        if (isFinished) return;

        isFinished = true;

        clearTimeout(timeoutTimer);

        taskResult = makeResult('success', $clicked);

        saveCurrentTask(taskResult);

        $('#successPopup')
            .removeAttr('hidden')
            .hide()
            .fadeIn(200, function () {

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
            .fadeIn(200, function () {

                $(this)
                    .find('input[name="failReason"]')
                    .first()
                    .focus();

            });

    }

    $(document).on('click', '.btn_next', function () {

        if (!taskResult) return;

        if (taskResult.result === 'fail') {

            var failReason = $('input[name="failReason"]:checked').val();

            if (!failReason) {

                $('input[name="failReason"]').first().focus();

                return;
            }

            taskResult.failReason = failReason;

            saveCurrentTask(taskResult);

        }

        goNextPage();

    });

    function bindFrameClick() {

        var frame = $frame[0];

        if (!frame || !frame.contentWindow || !frame.contentWindow.document) {

            return;
        }

        var frameDoc = frame.contentWindow.document;

        $(frameDoc)
            .off('click.utTest')
            .on('click.utTest', 'a, button', function (e) {

                if (!isStarted || isFinished) return;

                var $clicked = $(e.target).closest('a, button');

                if (!$clicked.length) return;

                var clickText = cleanText($clicked.text());

                if (!clickText) return;

                saveClick($clicked);

                if ($clicked.attr('data-answer') === 'true') {

                    e.preventDefault();

                    finishSuccess($clicked);

                }

            });

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