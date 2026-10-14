(function () {

	var isMobile =
		/Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry/i.test(
			navigator.userAgent
		);

	if (!isMobile) {
		return;
	}

	document.addEventListener('DOMContentLoaded', function () {

		document.body.innerHTML =
			'<main style="' +
				'display:flex;' +
				'flex-direction:column;' +
				'justify-content:center;' +
				'align-items:center;' +
				'min-height:100vh;' +
				'padding:24px;' +
				'box-sizing:border-box;' +
				'text-align:center;' +
				'line-height:1.5;' +
			'">' +

				'<h1 style="margin:0 0 24px;font-size:22px;font-weight:700; color: #111111;">PC 환경에서만 참여 가능합니다.</h1>' +

				'<p style="margin:0 0 16px;font-size:16px; color: #757575;">현재 진행되는 사용자 경험 조사는 <br>PC 화면 기준으로 제작되어 있습니다.</p>' +

				'<p style="margin:0 0 12px;font-size:16px; color: #757575;">모바일 또는 태블릿으로 참여할 경우 <br>화면 구성 및 메뉴 구조가 다르게 표시되어 <br>조사 결과에 영향을 줄 수 있습니다.</p>' +

				'<p style="margin:0 0 12px;font-size:16px; color: #757575;">정확한 조사 진행을 위해 <br>PC(데스크탑 또는 노트북) 환경에서 <br>다시 접속해 주시기 바랍니다.</p>' +

				'<p style="margin:0;font-size:16px; color: #757575;">감사합니다.</p>' +

			'</main>';

	});

})();