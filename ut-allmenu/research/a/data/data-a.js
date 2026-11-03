/* 고용24 전체메뉴 UT - A타입(AS-IS), 공통 탐색 과업 3개 */
$(function () {
    'use strict';

    if (!$('#testFrame').length || typeof UT_A === 'undefined') return;

    var BASE = '/UT-Hub/ut-allmenu/research/a/';
    var FRAME_URL = '/UT-Hub/ut-allmenu/source/frame/allmenu_asis.html';
    var LIMIT_MS = 180000;
    var TASKS = [
        {
            key: 'task1',
            answer: '직업심리검사',
            answerId: 'tab_person_EBG020000000085',
            scenario: '자신의 흥미와 적성에 맞는 직업이 무엇인지 알아보고 싶습니다. 이를 확인할 수 있는 서비스를 찾아주세요.'
        },
        {
            key: 'task2',
            answer: '쉽게 보는 고용정보',
            answerId: '',
            scenario: '구직 노하우, 고용 정책 등을 카드뉴스와 같은 시각화 이미지로 살펴보고 싶습니다. 관련 정보를 확인할 수 있는 메뉴를 찾아주세요.'
        },
        {
            key: 'task3',
            answer: '발급·관리',
            answerId: 'tab_person_EBG020440301003',
            scenario: '취업 준비를 위해 여러 경력 정보를 하나의 서류로 증명하려고 합니다. 해당 서비스를 찾아주세요.'
        }
    ];
    var ORDINAL = ['첫 번째', '두 번째', '세 번째'];

    var $page = $('#utPage');
    var $frame = $('#testFrame');
    var $intro = $('#utOverlay');
    var $success = $('#successPopup');
    var $fail = $('#failPopup');
    var $start = $('#startTest');
    var $time = $('#timeRemaining');
    var $dialogs = $intro.add($success).add($fail);

    var taskIndex = 0;
    var started = false;
    var finished = false;
    var frameReady = false;
    var moving = false;
    var startTime = 0;
    var lastClickTime = 0;
    var clickLogs = [];
    var lastMenu = '';
    var timer = null;
    var result = null;
    var activeDialog = null;

    function clean(value) {
        return $.trim(String(value == null ? '' : value).replace(/\s+/g, ' '));
    }

    function currentTask() {
        return TASKS[taskIndex];
    }

    function getMenuName($control) {
        var label = $control.attr('aria-label');
        var ids = $control.attr('aria-labelledby');
        if (!label && ids) {
            label = $.map(ids.split(/\s+/), function (id) {
                var node = $control[0].ownerDocument.getElementById(id);
                return node ? node.textContent : '';
            }).join(' ');
        }
        return clean(label || $control.text() || $control.attr('title')) || '(이름 없는 메뉴)';
    }

    function getDepth($control) {
        var explicit = $control.attr('data-depth');
        if (/^[1-4]$/.test(explicit || '')) return Number(explicit);
        if ($control.closest('.menuLevel4').length) return 4;
        if ($control.closest('.tab_title').length) return 1;
        if ($control.closest('.menu_tit').length) return 2;
        if ($control.closest('.txt_list').length || $control.hasClass('is_level4')) return 3;
        return 0;
    }

    function blockTest(block) {
        $page.prop('inert', block);
        if (block) {
            $page.attr('aria-hidden', 'true');
            $frame.attr('tabindex', '-1');
        } else {
            $page.removeAttr('aria-hidden');
            $frame.removeAttr('tabindex');
        }
    }

    function closeDialogs() {
        $dialogs.stop(true, true).hide().prop('hidden', true);
        activeDialog = null;
    }

    function openDialog($dialog, focusSelector) {
        blockTest(true);
        closeDialogs();
        activeDialog = $dialog;
        $dialog.prop('hidden', false).show();
        var $focus = $dialog.find(focusSelector).first();
        if ($focus.length) $focus.trigger('focus');
    }

    function updateTime() {
        if (!started || finished) return;
        var remaining = Math.max(0, LIMIT_MS - (Date.now() - startTime));
        var seconds = Math.ceil(remaining / 1000);
        var minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
        var rest = String(seconds % 60).padStart(2, '0');
        $time.text('남은 시간 ' + minutes + ':' + rest)
            .toggleClass('is_warning', seconds <= 30);
        if (remaining === 0) finish('fail');
    }

    function makeResult(status, finalMenu) {
        var ended = Date.now();
        return {
            targetMenu: currentTask().answer,
            scenario: currentTask().scenario,
            finalClickMenu: finalMenu || lastMenu,
            failReason: '',
            clickCount: clickLogs.length,
            duration: Math.min(LIMIT_MS / 1000, Math.round((ended - startTime) / 100) / 10),
            clickPath: UT_A.makeClickPath(clickLogs),
            result: status,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(ended).toISOString()
        };
    }

    function finish(status, name) {
        if (!started || finished) return;
        finished = true;
        started = false;
        clearInterval(timer);
        timer = null;
        result = makeResult(status, name);

        if (status === 'success') {
            UT_A.saveTask(currentTask().key, result);
            UT_A_TRACK.progress('TASK ' + (taskIndex + 1) + ' 완료', taskIndex + 1, clickLogs.length);
            openDialog($success, '.btn_next');
        } else {
            $fail.find('input[name="failReason"]').prop('checked', false);
            $('#failOther').val('').prop('disabled', true).prop('hidden', true);
            $('#failError').prop('hidden', true);
            UT_A_TRACK.progress('TASK ' + (taskIndex + 1) + ' 제한시간 종료', taskIndex + 1, clickLogs.length);
            openDialog($fail, 'input[name="failReason"]');
        }
    }

    function isCorrect($control, name) {
        var task = currentTask();
        if (name !== task.answer) return false;
        if (task.answerId) return $control.attr('id') === task.answerId;
        // 정확한 메뉴명이 실제 AS-IS 화면에 있을 경우에만 성공 처리.
        return $control.closest('.site_map_div').length > 0
            && getDepth($control) >= 2;
    }

    function logMenuClick($control) {
        var now = Date.now();
        var name = getMenuName($control);
        var depth = getDepth($control);
        clickLogs.push({
            text: (depth ? depth + 'dp_' : '') + name,
            second: Math.round((now - lastClickTime) / 100) / 10
        });
        lastClickTime = now;
        lastMenu = name;
        UT_A_TRACK.progress('TASK ' + (taskIndex + 1), taskIndex + 1, clickLogs.length);
        return name;
    }

    function bindFrame() {
        var doc;
        try {
            doc = $frame[0].contentDocument;
        } catch (ignore) {
            doc = null;
        }
        if (!doc || doc.readyState === 'loading') return;
        var $doc = $(doc);
        if (!$doc.find('#sitemappopup').length) {
            $('#frameError').text('전체메뉴를 불러오지 못했습니다. 화면 파일 경로를 확인해 주세요.').prop('hidden', false);
            frameReady = false;
            $start.prop('disabled', true);
            return;
        }

        // 이번 조사에서는 전체검색을 사용하지 않음.
        $doc.find('.keyword_search_area').prop('inert', true).attr('aria-hidden', 'true').hide();
        $doc.off('click.utAllmenuA', '.tab_title button,.site_map_div a,.site_map_div button.is_level4');
        $doc.on('click.utAllmenuA', '.tab_title button,.site_map_div a,.site_map_div button.is_level4', function (event) {
            if (!started || finished) return;
            event.preventDefault();
            if (Date.now() - startTime >= LIMIT_MS) {
                finish('fail');
                return;
            }
            var $control = $(this);
            var name = logMenuClick($control);
            if (isCorrect($control, name)) finish('success', name);
        });

        frameReady = true;
        $('#frameError').prop('hidden', true);
        $start.prop('disabled', false);
        openDialog($intro, '#startTest');
    }

    function setTaskText() {
        var task = currentTask();
        $('#taskProgress').text((taskIndex + 1) + ' / 3');
        $('#taskOrdinal').text(ORDINAL[taskIndex] + ' 테스트');
        $('#taskScenario,#taskQuestion').text(task.scenario);
        $time.text('남은 시간 03:00').removeClass('is_warning');
        $success.add($fail).find('.btn_next')
            .text(taskIndex === TASKS.length - 1 ? '설문으로 이동' : '다음 테스트로 이동');
    }

    function prepareTask(reload) {
        started = false;
        finished = false;
        frameReady = false;
        result = null;
        clickLogs = [];
        lastMenu = '';
        startTime = 0;
        lastClickTime = 0;
        moving = false;
        clearInterval(timer);
        timer = null;
        setTaskText();
        UT_A_TRACK.progress('TASK ' + (taskIndex + 1) + ' 준비', taskIndex + 1, 0);
        blockTest(true);
        closeDialogs();
        $start.prop('disabled', true);
        if (reload) {
            $frame.attr('src', FRAME_URL + '?task=' + (taskIndex + 1));
        } else {
            bindFrame();
        }
    }

    // 이미 마친 과업은 새로고침으로 중복 기록하지 않음.
    var saved = UT_A.getTaskResult();
    while (taskIndex < TASKS.length && saved[TASKS[taskIndex].key]) taskIndex++;
    if (taskIndex === TASKS.length) {
        UT_A_TRACK.navigate('사후 설문');
        location.replace(BASE + '6_survey_subjective.html');
        return;
    }

    $frame.on('load.utAllmenuA', bindFrame);
    prepareTask(false);

    $start.on('click.utAllmenuA', function () {
        if (started || finished || !frameReady) return;
        startTime = Date.now();
        lastClickTime = startTime;
        started = true;
        UT_A_TRACK.progress('TASK ' + (taskIndex + 1) + ' 진행', taskIndex + 1, 0);
        closeDialogs();
        blockTest(false);
        $frame.trigger('focus');
        updateTime();
        timer = setInterval(updateTime, 250);
    });

    $success.add($fail).find('.btn_next').on('click.utAllmenuA', function () {
        if (!result || moving) return;
        if (result.result === 'fail') {
            var $reason = $fail.find('input[name="failReason"]:checked');
            var reason = $reason.val();
            if (!reason) {
                $('#failError').text('실패 이유를 선택해 주세요.').prop('hidden', false);
                $fail.find('input[name="failReason"]').first().trigger('focus');
                return;
            }
            if (reason === '기타') {
                reason = clean($('#failOther').val());
                if (!reason) {
                    $('#failError').text('기타 이유를 입력해 주세요.').prop('hidden', false);
                    $('#failOther').trigger('focus');
                    return;
                }
            } else {
                reason = Number(reason);
            }
            result.failReason = reason;
            UT_A.saveTask(currentTask().key, result);
        }
        UT_A_TRACK.progress('TASK ' + (taskIndex + 1) + ' 완료', taskIndex + 1, clickLogs.length);
        moving = true;
        if (taskIndex === TASKS.length - 1) {
            UT_A_TRACK.navigate('사후 설문');
            location.href = BASE + '6_survey_subjective.html';
            return;
        }
        taskIndex++;
        prepareTask(true);
    });

    $fail.find('input[name="failReason"]').on('change.utAllmenuA', function () {
        var other = $('#failReason05').prop('checked');
        $('#failOther').prop('hidden', !other).prop('disabled', !other);
        $('#failError').prop('hidden', true);
        if (other) $('#failOther').trigger('focus');
    });
    $('#failOther').on('input.utAllmenuA', function () {
        $('#failError').prop('hidden', true);
    });

    // 모든 팝업은 모달이며, 키보드 초점은 열린 팝업 안에 유지.
    $(document).on('keydown.utAllmenuA', function (event) {
        if (!activeDialog || event.which !== 9) return;
        var $items = activeDialog.find('button:not(:disabled),input:not(:disabled),a[href],textarea:not(:disabled)')
            .filter(':visible');
        if (!$items.length) return;
        var first = $items[0];
        var last = $items[$items.length - 1];
        var focus = document.activeElement;
        if (event.shiftKey && (focus === first || !$.contains(activeDialog[0], focus))) {
            event.preventDefault();
            $(last).trigger('focus');
        } else if (!event.shiftKey && (focus === last || !$.contains(activeDialog[0], focus))) {
            event.preventDefault();
            $(first).trigger('focus');
        }
    });
});
