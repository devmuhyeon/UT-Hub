$(function () {

    history.pushState(null, null, location.href);

    $(window).on('popstate', function () {

        history.pushState(null, null, location.href);

        alert('테스트 진행중에 뒤로가기를 사용할 수 없습니다.');

    });

});