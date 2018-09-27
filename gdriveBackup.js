uploadPipe = request.get({
				url: self.leech.url,
				headers: {
					'Range': `bytes=${self.byteCount}-`,
					"Origin": "https://openload.co",
					//'Accept-Language': 'en-US,en;q=0.9',
					"Accept-Encoding": "identity;q=1, *;q=0",
					//"User-Agent": "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36",
					"Accept": "*/*",
					"Referer": (self.leech && self.leech.url)? self.leech.url: 'https://openload.co/embed/SRfXvQH6W88/'+ "?autostart=true",
					"Connection": "keep-alive",
					"Cache-Control": "no-cache",
					// chrome-proxy: frfr

				}
			});
