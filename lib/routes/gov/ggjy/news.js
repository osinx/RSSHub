const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const sector_id = ctx.params.sector_id;

    const index_response = await got.get(`http://ggjy.wehdz.gov.cn/fore/selectHomeContentView?sector_id=${sector_id}`, {
        headers: {
            Referer: 'http://ggjy.wehdz.gov.cn/fore/foreEndIndex',
        },
    });

    const $ = cheerio.load(index_response.data);
    const title = $('#sp_title').text();

    const news_response = await got.post('http://ggjy.wehdz.gov.cn/fore/selectHomeContentPage', {
        headers: {
            Referer: `http://ggjy.wehdz.gov.cn/fore/selectHomeContentView?sector_id=${sector_id}`,
        },
        form: {
            pageSize: 8,
            pageNo: 1,
            sectorId: sector_id,
            cnt_title: '',
        },
    });

    const news = news_response.data.msg.obj.list || [];
    const out = news.map((item) => {
        const title = item.cnt_title;
        const pubDate = new Date(item.sub_status_date).toUTCString();
        const link = `http://ggjy.wehdz.gov.cn/fore/selectContentDetailView?content_id=${item.content_id}&sector_id=${item.sector_id}`;
        const description = '';

        return {
            title,
            pubDate,
            link,
            description,
        };
    });

    const items = await Promise.all(
        out.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const { data: response } = await got(item.link);
                const $ = cheerio.load(response);
                item.description = $('.artcontent').first().html();
                return item;
            })
        )
    );

    ctx.state.data = {
        title: `光谷教育-${title}`,
        link: `http://ggjy.wehdz.gov.cn/fore/selectHomeContentView?sector_id=${sector_id}`,
        description: '',
        item: items,
    };
};
