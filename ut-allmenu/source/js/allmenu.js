
/* 전체메뉴에 필요한 동작만 유지. jQuery 3.6.3 */
jQuery(function ($) {
    var active = 'tab_person', results = $(), resultIndex = -1;
    var $menu = $('#sitemappopup');
    var isTabMoving = false;

    function status(text) {
        $('#menu-status').text(text);
    }

    function selectCategory(id, move) {
        var $section = $('#' + id);
        if (!$section.length) return;

        $('.' + active + ' .tab_title li').each(function () {
            var chosen = $(this).attr('aria-controls') === id;

            $(this)
                .toggleClass('active', chosen)
                .find('button')
                .attr('aria-pressed', String(chosen))
                .find('span')
                .css({
                    backgroundColor: chosen ? '#62D491' : '#fff',
                    color: chosen ? '#333' : ''
                });
        });

        $('#' + active + '_cont .site_map_div > ol > li > p > a')
            .removeClass('active');

        $section.children('ol')
            .children('li')
            .children('p')
            .children('a')
            .addClass('active');

        if (move) {
            var top = $section[0].offsetTop - 60;
            isTabMoving = true;

            $menu.stop().animate({
                scrollTop: Math.max(0, top)
            }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400, function () {
                $section.find('h5').first()
                    .attr('tabindex', '-1')
                    .trigger('focus');

                isTabMoving = false;
            });
        }
    }

    function switchTab(tab) {
        $menu.stop();
        isTabMoving = false;
        active = tab;

        $('.site_info li').each(function () {
            var chosen = $(this).attr('aria-controls') === tab;

            $(this)
                .toggleClass('active', chosen)
                .find('button')
                .attr('aria-selected', String(chosen))
                .attr('tabindex', chosen ? '0' : '-1');
        });

        $('.site_info')
            .toggleClass('site_info_company', tab === 'tab_company');

        $('.box_tab-contents')
            .hide()
            .removeClass('active');

        $('.box_tab-contents.' + tab)
            .show()
            .addClass('active');

        $('#tab_person_cont,#tab_company_cont')
            .hide()
            .attr('hidden', true);

        $('#' + tab + '_cont')
            .show()
            .removeAttr('hidden');

        $menu.scrollTop(0);

        results = $();
        resultIndex = -1;
        $('.stit_area').hide();

        selectCategory(
            $('.' + tab + ' .tab_title li')
                .first()
                .attr('aria-controls'),
            false
        );
    }

    $('.site_info li').removeAttr('role').each(function () {
        var id = $(this).attr('aria-controls');

        $(this).find('button').attr({
            id: id + '_button',
            'aria-controls': id + '_cont'
        });

        $('#' + id + '_cont').attr({
            role: 'tabpanel',
            'aria-labelledby': id + '_button'
        });
    });

    $('.site_info button')
        .on('click', function () {
            switchTab($(this).parent().attr('aria-controls'));
        })
        .on('keydown', function (e) {
            var $tabs = $('.site_info button');

            if (!/^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) {
                return;
            }

            e.preventDefault();

            var index = e.key === 'Home'
                ? 0
                : e.key === 'End'
                    ? $tabs.length - 1
                    : (
                        $tabs.index(this) +
                        (e.key === 'ArrowRight' ? 1 : -1) +
                        $tabs.length
                    ) % $tabs.length;

            $tabs.eq(index)
                .trigger('click')
                .trigger('focus');
        });

    $('.tab_title')
        .removeAttr('role')
        .find('button')
        .removeAttr('role aria-selected')
        .on('click', function () {
            selectCategory(
                $(this).parent().attr('aria-controls'),
                true
            );
        });

    $('[data-original-action]').each(function () {
        var action = $(this).attr('data-original-action') || '';
        var args = action.match(
            /fn_goMenuUrl\('([^']*)',\s*'([^']*)'/
        );

        if (args) {
            $(this).attr(
                'href',
                /^https?:/.test(args[2])
                    ? args[2]
                    : 'https://www.work24.go.kr' + args[1] + args[2]
            );
        }

        $(this).removeAttr('data-original-action');
    });

    /*
     * 4뎁스 메뉴
     * a.is_level4 원본 유지
     * 클릭하면 다음 .menuLevel4 열기/닫기
     */
    $('.menuLevel4').each(function (index) {
        var $list = $(this);
        var $link = $list.prev('a.is_level4');

        if (!$link.length) return;

        if (!$list.text().trim()) {
            $list.remove();
            return;
        }

        var id = $list.attr('id') || 'submenu-' + index;

        $list.attr('id', id).hide();

        $link.attr({
            'role': 'button',
            'aria-controls': id,
            'aria-expanded': 'false'
        });

        $link.on('click', function (e) {
            e.preventDefault();

            var open = $(this).attr('aria-expanded') !== 'true';

            $(this)
                .attr('aria-expanded', String(open))
                .toggleClass('active', open);

            $list.toggle(open);
        }).on('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                $(this).trigger('click');
            }
        });
    });

    function focusResult(index) {
        if (!results.length) return;

        resultIndex = (index + results.length) % results.length;
        results.removeClass('match_on');

        var $result = results.eq(resultIndex)
            .addClass('match_on');

        $result.parents('.menuLevel4').each(function () {
            $(this)
                .show()
                .prev('a.is_level4')
                .attr('aria-expanded', 'true')
                .addClass('active');
        });

        $result.trigger('focus');

        status(
            results.length + '건 중 ' +
            (resultIndex + 1) + '번째 결과'
        );
    }

    function search() {
        var keyword = $.trim($('#searchTxt').val());

        $menu.find('.match,.match_on')
            .removeClass('match match_on');

        if (!keyword) {
            status('검색어를 입력해 주세요.');
            $('#searchTxt').trigger('focus');
            return;
        }

        results = $('#' + active + '_cont')
            .find('a')
            .filter(function () {
                return $(this).text().indexOf(keyword) !== -1;
            })
            .addClass('match');

        $('.stit_area')
            .first()
            .show()
            .find('.txt_total')
            .text(results.length);

        status('검색 결과 ' + results.length + '건');
        resultIndex = -1;

        if (results.length) {
            focusResult(0);
        }
    }

    $('#btn_searchSiteMap').on('click', search);

    $('#searchTxt').on('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            search();
        }
    });

    $('.stit_area .box_btn_group button')
        .eq(0)
        .on('click', function () {
            focusResult(resultIndex - 1);
        });

    $('.stit_area .box_btn_group button')
        .eq(1)
        .on('click', function () {
            focusResult(resultIndex + 1);
        });

    $('.siteMap_ico09').remove();

    $menu.find('a[href="#"]').on('click', function (e) {
        e.preventDefault();
    });

    $(window).on('resize', function () {
        $menu.toggleClass(
            'resize',
            $(window).width() <= 1248
        );
    }).trigger('resize');

    function syncScrollCategory() {
        if (isTabMoving) return;

        var $sections = $('#' + active + '_cont .selection:visible');

        if (!$sections.length) return;

        var reference = $('.fixedDiv').offset().top +
            $('.fixedDiv').outerHeight() + 80;

        var id = $sections.first().attr('id');

        $sections.each(function () {
            if ($(this).offset().top <= reference) {
                id = $(this).attr('id');
            }
        });

        var element = $menu[0];

        if (
            $menu.scrollTop() > 0 &&
            element.scrollHeight -
            element.clientHeight -
            $menu.scrollTop() <= 2
        ) {
            id = $sections.last().attr('id');
        }

        selectCategory(id, false);
    }

    $menu.on('scroll.allmenu', syncScrollCategory);

    $(window).on(
        'resize.allmenu load.allmenu',
        syncScrollCategory
    );

    $menu.on(
        'click.allmenu',
        '.is_level4',
        syncScrollCategory
    );

    $menu.find('.txt_list > a')
        .on('mouseenter focus', function () {
            $(this).next('.site_map_cn')
                .stop(true, true)
                .show();
        })
        .on('mouseleave blur', function () {
            $(this).next('.site_map_cn')
                .stop(true, true)
                .hide();
        });

    switchTab(active);
});
