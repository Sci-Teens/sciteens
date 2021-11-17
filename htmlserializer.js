var PrismicDOM = require('prismic-dom');
var Elements = PrismicDOM.RichText.Elements;

export default function htmlSerializer(type, element, content, children) {
    switch (type) {

        case Elements.embed:
            return (
                <div data-oembed={element.oembed.embed_url} data-oembed-type={element.oembed.type} data-oembed-provider={element.oembed.provider_name} className="w-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: element.oembed.html }}>
                </div>
            );

        case Elements.image:
            return (<img src={element.url} alt={element.alt || ''} className="mx-auto w-full"></img>)


        // Return null to stick with the default behavior for all other elements
        default:
            return null;
    }
};