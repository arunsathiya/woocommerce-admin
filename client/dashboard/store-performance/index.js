/** @format */
/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Component, Fragment } from '@wordpress/element';
import { compose } from '@wordpress/compose';
import { withDispatch } from '@wordpress/data';
import moment from 'moment';
import { find } from 'lodash';

/**
 * WooCommerce dependencies
 */
import { getCurrentDates, appendTimestamp, getDateParamsFromQuery } from '@woocommerce/date';
import { getNewPath, getPersistedQuery } from '@woocommerce/navigation';
import { calculateDelta, formatValue } from '@woocommerce/number';
import { formatCurrency } from '@woocommerce/currency';

/**
 * Internal dependencies
 */
import {
	EllipsisMenu,
	MenuItem,
	MenuTitle,
	SectionHeader,
	SummaryList,
	SummaryListPlaceholder,
	SummaryNumber,
} from '@woocommerce/components';
import withSelect from 'wc-api/with-select';
import './style.scss';

class StorePerformance extends Component {
	constructor( props ) {
		super( props );
		this.state = {
			hiddenIndicators: props.hiddenIndicators || [],
		};
		this.toggle = this.toggle.bind( this );
	}

	toggle( statKey ) {
		return () => {
			this.setState( state => {
				const indicators = [ ...state.hiddenIndicators ];
				let newHiddenIndicators = [];
				if ( ! indicators.includes( statKey ) ) {
					indicators.push( statKey );
					newHiddenIndicators = indicators;
				} else {
					newHiddenIndicators = indicators.filter( indicator => indicator !== statKey );
				}
				this.props.updateCurrentUserData( {
					dashboard_performance_indicators: newHiddenIndicators,
				} );
				return {
					hiddenIndicators: newHiddenIndicators,
				};
			} );
		};
	}

	renderMenu() {
		const { indicators } = this.props;
		return (
			<EllipsisMenu label={ __( 'Choose which analytics to display', 'woocommerce-admin' ) }>
				<MenuTitle>{ __( 'Display Stats:', 'woocommerce-admin' ) }</MenuTitle>
				{ indicators.map( ( indicator, i ) => {
					const checked = ! this.state.hiddenIndicators.includes( indicator.stat );
					return (
						<MenuItem
							checked={ checked }
							isCheckbox
							isClickable
							key={ i }
							onInvoke={ this.toggle( indicator.stat ) }
						>
							{ sprintf( __( 'Show %s', 'woocommerce-admin' ), indicator.label ) }
						</MenuItem>
					);
				} ) }
			</EllipsisMenu>
		);
	}

	renderList() {
		const {
			query,
			primaryRequesting,
			secondaryRequesting,
			primaryError,
			secondaryError,
			primaryData,
			secondaryData,
			userIndicators,
		} = this.props;
		if ( primaryRequesting || secondaryRequesting ) {
			return <SummaryListPlaceholder numberOfItems={ userIndicators.length } />;
		}

		if ( primaryError || secondaryError ) {
			return null;
		}

		const persistedQuery = getPersistedQuery( query );

		const { compare } = getDateParamsFromQuery( query );
		const prevLabel =
			'previous_period' === compare
				? __( 'Previous Period:', 'woocommerce-admin' )
				: __( 'Previous Year:', 'woocommerce-admin' );
		return (
			<SummaryList>
				{ () =>
					userIndicators.map( ( indicator, i ) => {
						const primaryItem = find( primaryData.data, data => data.stat === indicator.stat );
						const secondaryItem = find( secondaryData.data, data => data.stat === indicator.stat );

						if ( ! primaryItem || ! secondaryItem ) {
							return null;
						}

						const href =
							( primaryItem._links &&
								primaryItem._links.report[ 0 ] &&
								primaryItem._links.report[ 0 ].href ) ||
							'';
						const reportUrl =
							( href && getNewPath( persistedQuery, href, { chart: primaryItem.chart } ) ) || '';
						const isCurrency = 'currency' === primaryItem.format;

						const delta = calculateDelta( primaryItem.value, secondaryItem.value );
						const primaryValue = isCurrency
							? formatCurrency( primaryItem.value )
							: formatValue( primaryItem.format, primaryItem.value );
						const secondaryValue = isCurrency
							? formatCurrency( secondaryItem.value )
							: formatValue( secondaryItem.format, secondaryItem.value );

						return (
							<SummaryNumber
								key={ i }
								href={ reportUrl }
								label={ indicator.label }
								value={ primaryValue }
								prevLabel={ prevLabel }
								prevValue={ secondaryValue }
								delta={ delta }
							/>
						);
					} )
				}
			</SummaryList>
		);
	}

	render() {
		return (
			<Fragment>
				<SectionHeader
					title={ __( 'Store Performance', 'woocommerce-admin' ) }
					menu={ this.renderMenu() }
				/>
				<div className="woocommerce-dashboard__store-performance">{ this.renderList() }</div>
			</Fragment>
		);
	}
}
export default compose(
	withSelect( ( select, props ) => {
		const { query } = props;
		const {
			getCurrentUserData,
			getReportItems,
			getReportItemsError,
			isReportItemsRequesting,
		} = select( 'wc-api' );
		const userData = getCurrentUserData();
		let hiddenIndicators = userData.dashboard_performance_indicators;

		// Set default values for user preferences if none is set.
		// These columns are HIDDEN by default.
		if ( ! hiddenIndicators ) {
			hiddenIndicators = [
				'coupons/amount',
				'coupons/orders_count',
				'downloads/download_count',
				'taxes/order_tax',
				'taxes/total_tax',
				'taxes/shipping_tax',
				'revenue/shipping',
			];
		}

		const datesFromQuery = getCurrentDates( query );
		const endPrimary = datesFromQuery.primary.before;
		const endSecondary = datesFromQuery.secondary.before;

		const indicators = wcSettings.dataEndpoints.performanceIndicators;
		const userIndicators = indicators.filter(
			indicator => ! hiddenIndicators.includes( indicator.stat )
		);
		const statKeys = userIndicators.map( indicator => indicator.stat ).join( ',' );

		const primaryQuery = {
			after: appendTimestamp( datesFromQuery.primary.after, 'start' ),
			before: appendTimestamp( endPrimary, endPrimary.isSame( moment(), 'day' ) ? 'now' : 'end' ),
			stats: statKeys,
		};

		const secondaryQuery = {
			after: appendTimestamp( datesFromQuery.secondary.after, 'start' ),
			before: appendTimestamp(
				endSecondary,
				endSecondary.isSame( moment(), 'day' ) ? 'now' : 'end'
			),
			stats: statKeys,
		};

		const primaryData = getReportItems( 'performance-indicators', primaryQuery );
		const primaryError = getReportItemsError( 'performance-indicators', primaryQuery ) || null;
		const primaryRequesting = isReportItemsRequesting( 'performance-indicators', primaryQuery );

		const secondaryData = getReportItems( 'performance-indicators', secondaryQuery );
		const secondaryError = getReportItemsError( 'performance-indicators', secondaryQuery ) || null;
		const secondaryRequesting = isReportItemsRequesting( 'performance-indicators', secondaryQuery );

		return {
			hiddenIndicators,
			userIndicators,
			indicators,
			primaryData,
			primaryError,
			primaryRequesting,
			secondaryData,
			secondaryError,
			secondaryRequesting,
		};
	} ),
	withDispatch( dispatch => {
		const { updateCurrentUserData } = dispatch( 'wc-api' );

		return {
			updateCurrentUserData,
		};
	} )
)( StorePerformance );
