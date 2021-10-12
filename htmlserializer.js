var PrismicDOM = require('prismic-dom');
import Image from 'next/image'
var Elements = PrismicDOM.RichText.Elements;

const imageLoader = ({ src, width, height }) => {
    return `${src}?fit=crop&crop=faces&w=${width || 256}&h=${height || 256}`
}

export default function htmlSerializer(type, element, content, children) {
    switch (type) {

        // Don't wrap images in a <p> tag
        case Elements.image:
            return (<Image src={element.url} width={582} height={389} loader={imageLoader} class="w-full" />)

        case Elements.embed:
            return (
                <div data-oembed={element.oembed.embed_url} data-oembed-type={element.oembed.type} data-oembed-provider={element.oembed.provider_name} class="w-full flex items-center justify-center" dangerouslySetInnerHTML={{ __html: element.oembed.html }}>
                </div>
            );

        // Return null to stick with the default behavior for all other elements
        default:
            return null;
    }
};