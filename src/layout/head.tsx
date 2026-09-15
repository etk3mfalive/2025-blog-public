import Script from 'next/script'

/**
 * Google Analytics 4 媒体资源 ID。
 * 以前这里硬编码的是上游模板作者的 ID（G-ZNSFR7C9PM），等于把本站访问数据上报到别人的媒体资源；
 * 现在改为读环境变量 NEXT_PUBLIC_GA_ID，未配置则完全不加载 GA。
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export default function Head() {
	return (
		<head>
			<meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />
			<link rel='manifest' href='/manifest.json' />

			<link rel='icon' href='/favicon.png' />

			<link rel='preconnect' href='https://fonts.googleapis.cn' />
			<link rel='preconnect' href='https://fonts.gstatic.cn' crossOrigin='anonymous' />

			<link href='https://fonts.googleapis.cn/css2?family=Averia+Gruesa+Libre&display=swap' rel='stylesheet' />

			{GA_ID && (
				<>
					<Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
					<Script id='google-analytics'>
						{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_ID}');
        `}
					</Script>
				</>
			)}
		</head>
	)
}
