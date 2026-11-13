/* 고용24 전체메뉴 UT - B타입(TO-BE), 공통 탐색 과업 3개 */
$(function () {
    'use strict';

    if (!$('#testFrame').length || typeof UT_B === 'undefined') return;

    var BASE = '/UT-Hub/ut-allmenu/research/b/';
    var FRAME_URL = '/UT-Hub/ut-allmenu/source/frame/allmenu_tobe.html';
    var LIMIT_MS = UT_B_CONFIG.taskLimitSeconds * 1000;
    var TASKS = [
        {key: 'toggle', answer: '토글 기능 찾기', scenario: '전체메뉴에서 각 메뉴에 대한 간결한 설명이 보이도록 설정하는 기능을 찾아주세요.'},
        {
            key: 'task1',
            answer: '직업심리검사',
            answerId: 'tab_person_EBG020000000085',
            scenario: '나에게 맞는 직업을 알아보기 위해 흥미와 적성을 검사를 해볼 수 있는 메뉴를 찾아주세요.'
        },
        {
            key: 'task2',
            answer: '쉽게 보는 고용정보',
            answerId: '',
            scenario: '구직 노하우나 고용 정책 등 다양한 고용정보를 쉽게 살펴볼 수 있는 메뉴를 찾아주세요.'
        },
        {
            key: 'task3',
            answer: '발급 신청',
            answerId: 'tab_person_EBG020040300081',
            scenario: '직업훈련을 받기 위해 국민내일배움카드를 발급 및 신청할 수 있는 메뉴를 찾아주세요.'
        }
    ];
    var ORDINAL = ['첫 번째', '두 번째', '세 번째', '네 번째'];

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

    function taskLabel() { return taskIndex === 0 ? '토글' : 'TASK ' + taskIndex; }

    function currentTask() {
        return TASKS[taskIndex];
    }

    function getMenuName($control) {
        if ($control.is('#order_check_all')) return '메뉴 설명 ' + ($control.prop('checked') ? '보기' : '숨기기');
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
            failOther: '',
            clickCount: clickLogs.length,
            duration: Math.min(LIMIT_MS / 1000, Math.round((ended - startTime) / 100) / 10),
            clickPath: UT_B.makeClickPath(clickLogs),
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
            UT_B.saveTask(currentTask().key, result);
            openDialog($success, '.btn_next');
        } else {
            $fail.find('input[name="failReason"]').prop('checked', false);
            $('#failOther').val('').prop('disabled', true).prop('hidden', true);
            $('#failError').prop('hidden', true);
            openDialog($fail, 'input[name="failReason"]');
        }
    }


    function isCorrect($control, name) {
        var task = currentTask();

        if (task.key === 'toggle') return false;
        if (name !== task.answer) return false;

        if (task.answerId) {
            return $control.attr('id') === task.answerId;
        }

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

        // 프레임 내부 jQuery로 기존 설명 표시 동작을 실행한다.
        // 토글 과업은 숨김, TASK 1~3은 보기 상태에서 시작한다.
        // 시작 전 초기화이므로 과업 클릭 수에는 포함되지 않는다.
        $frame[0].contentWindow.jQuery('#order_check_all')
            .prop('checked', currentTask().key !== 'toggle')
            .trigger('change');

        // 이번 조사에서는 전체검색을 사용하지 않음.
        $doc.find('.keyword_search_area').prop('inert', true).attr('aria-hidden', 'true').hide();
        $doc.off('click.utAllmenuB', '.tab_title button,.site_map_div a,.site_map_div button.is_level4');
        $doc.on('click.utAllmenuB', '.tab_title button,.site_map_div a,.site_map_div button.is_level4', function (event) {
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

        // change는 마우스 라벨 클릭과 키보드 Space 조작 모두 한 번만 기록한다.
        $doc.off('change.utAllmenuB', '#order_check_all').on('change.utAllmenuB', '#order_check_all', function () {
            if (!started || finished) return;
            if (Date.now() - startTime >= LIMIT_MS) { finish('fail'); return; }
            var name = logMenuClick($(this));
            if (currentTask().key === 'toggle' && $(this).prop('checked') &&
                $doc.find('.site_map_cn').length > 0 &&
                $doc.find('.site_map_cn').filter(function () { return this.hidden; }).length === 0) {
                finish('success', name);
            }
        });
        frameReady = true;
        $('#frameError').prop('hidden', true);
        $start.prop('disabled', false);
        openDialog($intro, '#startTest');
    }

    function setTaskText() {
        var task = currentTask();
        var reasons = task.key === 'toggle' ? [
            '기능이 어디에 있는지 찾기 어려웠다.',
            '버튼의 명칭이나 의미를 이해하기 어려웠다.',
            '어떤 버튼을 사용해야 하는지 판단하기 어려웠다.',
            '기능을 찾았지만 조작 방법을 이해하기 어려웠다.',
            '기능을 찾거나 사용하는 과정에서 다른 메뉴나 버튼과 혼동했다.',
            '기타 (직접 입력)'
        ] : [
            '메뉴명이 무엇을 의미하는지 이해하기 어려웠어요.',
            '어떤 분류에서 찾아야 할지 판단하기 어려웠어요.',
            '비슷한 메뉴가 여러 개 있어 선택하기 어려웠어요.',
            '메뉴가 많아 원하는 메뉴를 찾기 어려웠어요.',
            '메뉴 설명을 읽어도 어떤 서비스인지 알기 어려웠어요.',
            '기타(직접 입력)'
        ];
        $.each(reasons, function (i, text) { $('label[for="failReason0' + (i + 1) + '"]').text(text); });
        $('#failTitle').text(task.key === 'toggle' ? '메뉴 설명 보기·숨기기 기능을 찾거나 사용하는 데 어려웠던 이유는 무엇인가요?' : '메뉴를 찾는 데 어떤 점이 어려웠나요?');
        $('#successTitle').text(task.key === 'toggle' ? '메뉴 설명 보기 기능을 사용하셨네요!' : '메뉴를 찾으셨네요!');
        $('#taskProgress').text((taskIndex + 1) + ' / 4');
        $('#taskOrdinal').text(ORDINAL[taskIndex] + ' 테스트');
        $('#taskScenario,#taskQuestion').text(task.scenario);
        $time.text('남은 시간 ' + String(Math.floor(LIMIT_MS / 60000)).padStart(2, '0') + ':' + String(LIMIT_MS / 1000 % 60).padStart(2, '0')).removeClass('is_warning');
        $('#taskLimitText').text(LIMIT_MS / 1000 + '초');
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
    var saved = UT_B.getTaskResult();
    while (taskIndex < TASKS.length && saved[TASKS[taskIndex].key]) taskIndex++;
    if (taskIndex === TASKS.length) {
        location.replace(BASE + '5_survey_subjective.html');
        return;
    }

    $frame.on('load.utAllmenuB', bindFrame);
    prepareTask(false);

    // TASK3 시작 후 앞부분 결과를 미리 전송한다. 실패해도 TASK3 진행은 멈추지 않는다.
    function sendEarlyResult() {
        var survey = UT_B.getSurvey();
        var tasks = UT_B.getTaskResult();
        var required = ['toggle', 'task1', 'task2'];
        var hasResults = $.grep(required, function (key) {
            return tasks[key] && /^(success|fail)$/.test(tasks[key].result);
        }).length === required.length;
        var id = UT_B.getSubmissionId();

        if (!id || !survey.age || !survey.experience || !survey.member || !hasResults) return;
        if (!UT_B_CONFIG.webAppUrl) return;

        var data = {
            action: 'partial',
            groupNo: 'B',
            submissionId: id,
            age: survey.age,
            experience: survey.experience,
            member: survey.member,
            userAgent: navigator.userAgent,
            toggle: tasks.toggle,
            task1: tasks.task1,
            task2: tasks.task2
        };

        UT_B.post(data);
    }

    $start.on('click.utAllmenuB', function () {
        if (started || finished || !frameReady) return;
        startTime = Date.now();
        lastClickTime = startTime;
        started = true;
        if (currentTask().key === 'task3') sendEarlyResult();
        closeDialogs();
        blockTest(false);
        $frame.contents().find('#sitemappopup').trigger('focus');
        updateTime();
        timer = setInterval(updateTime, 250);
    });

    $success.add($fail).find('.btn_next').on('click.utAllmenuB', function () {
        if (!result || moving) return;
        if (result.result === 'fail') {
            var $reason = $fail.find('input[name="failReason"]:checked');
            var reason = $reason.val();
            if (!reason) {
                $('#failError').text('실패 이유를 선택해 주세요.').prop('hidden', false);
                $fail.find('input[name="failReason"]').first().trigger('focus');
                return;
            }
            if (reason === '6') {
                result.failOther = clean($('#failOther').val());
                if (!result.failOther) {
                    $('#failError').text('기타 이유를 입력해 주세요.').prop('hidden', false);
                    $('#failOther').trigger('focus');
                    return;
                }
            }
            result.failReason = clean($reason.siblings('label[for="' + $reason.attr('id') + '"]').text());
            UT_B.saveTask(currentTask().key, result);
        }
        moving = true;
        if (taskIndex === TASKS.length - 1) {
            location.href = BASE + '5_survey_subjective.html';
            return;
        }
        taskIndex++;
        prepareTask(true);
    });

    $fail.find('input[name="failReason"]').on('change.utAllmenuB', function () {
        var other = $('#failReason06').prop('checked');
        $('#failOther').prop('hidden', !other).prop('disabled', !other);
        $('#failError').prop('hidden', true);
        if (other) $('#failOther').trigger('focus');
    });
    $('#failOther').on('input.utAllmenuB', function () {
        $('#failError').prop('hidden', true);
    });

    // 모든 팝업은 모달이며, 키보드 초점은 열린 팝업 안에 유지.
    $(document).on('keydown.utAllmenuB', function (event) {
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
