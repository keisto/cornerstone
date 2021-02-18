import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';
import swal from './global/sweet-alert';

export default class Category extends CatalogPage {
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);
    }
    
    showProductSecondImageOnHover() {
        const products = $('li.product');
        
        products.each((index) => {
            const product = products[index];
            const productImages = $(product).find('.card-img-container');
            
            if (productImages.length > 1) {
                $(product).hover(() => {
                    productImages.each((index) => $(productImages[index]).toggleClass('u-hidden'));
                });            
            }
        });
    }
    
    addAllToCart() {
        const products = $('li.product');
        
        const data = { lineItems: [] };
        
        // Build data with products on page
        products.each((index) => {
            data.lineItems.push({ 
                productId: $(products[index]).data('product-id'),
                quantity: 1
            })
        });
        
        // Get cart instance
        $.ajax({
            "crossDomain": true,
            "url": window.location.origin + "/api/storefront/carts?include=lineItems.digitalItems.options%2ClineItems.physicalItems.options",
        }).done((response) => {
            if (!response[0]) {   
                // Cart is empty -> create new cart
                $.ajax({
                    "crossDomain": true,
                    "url": window.location.origin + "/api/storefront/carts?include=lineItems.digitalItems.options%2ClineItems.physicalItems.options",
                    "method": "POST",
                    "headers": {
                        "content-type": "application/json"
                    },
                    "processData": false,
                    "data": JSON.stringify(data)
                }).done((response) => {
                    // Notify User
                    swal.fire({
                        text: 'Items have been added to cart!',
                        icon: 'success',
                    }).then(() => {
                        // Refresh page
                        window.location.reload();
                    });
                });
            } else {
                // Add items to existing cart
                $.ajax({
                    "crossDomain": true,
                    "url": window.location.origin + "/api/storefront/carts/" + response[0].id + "/items?include=lineItems.digitalItems.options%2ClineItems.physicalItems.options",
                    "method": "POST",
                    "headers": {
                        "content-type": "application/json"
                    },
                    "processData": false,
                    "data": JSON.stringify(data)
                }).done((response) => {
                    // Notify User
                    swal.fire({
                        text: 'Items have been added to cart!',
                        icon: 'success',
                    }).then(() => {
                        // Refresh page
                        window.location.reload();
                    });
                });
            }
        });
    }
    
    removeAllFromCart() {                
        // Get cart instance
        $.ajax({
            "crossDomain": true,
            "url": window.location.origin + "/api/storefront/carts?include=lineItems.digitalItems.options%2ClineItems.physicalItems.options",
        }).done((response) => {
            if (!response[0]) {
                return;
            }
            
            // Delete cart
            $.ajax({
                "crossDomain": true,
                "url": window.location.origin + "/api/storefront/carts/" + response[0].id,
                "method": "DELETE",
            }).done((response) => {
                // Notify User
                swal.fire({
                    text: 'Cart has been cleared!',
                    icon: 'success',
                }).then(() => {
                    // Refresh page
                    window.location.reload();
                });
            });
        });  
    }    

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.showProductSecondImageOnHover();
        
        $('#add-all-to-cart').on('click', this.addAllToCart);
        
        $('#remove-all-items').on('click', this.removeAllFromCart);
        
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        this.ariaNotifyNoProducts();
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
