<?php
/**
 * REST API Orders Controller
 *
 * Handles requests to /orders/*
 *
 * @package WooCommerce Admin/API
 */

defined( 'ABSPATH' ) || exit;

/**
 * Orders controller.
 *
 * @package WooCommerce Admin/API
 * @extends WC_REST_Orders_Controller
 */
class WC_Admin_REST_Orders_Controller extends WC_REST_Orders_Controller {
	/**
	 * Endpoint namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'wc/v4';

	/**
	 * Get the query params for collections.
	 *
	 * @return array
	 */
	public function get_collection_params() {
		$params           = parent::get_collection_params();
		$params['number'] = array(
			'description'       => __( 'Limit result set to orders matching part of an order number.', 'woocommerce-admin' ),
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
		);
		return $params;
	}

	/**
	 * Prepare objects query.
	 *
	 * @param  WP_REST_Request $request Full details about the request.
	 * @return array
	 */
	protected function prepare_objects_query( $request ) {
		global $wpdb;
		$args = parent::prepare_objects_query( $request );

		// Search by partial order number.
		if ( ! empty( $request['number'] ) ) {
			$order_ids = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->prefix}posts WHERE post_type = 'shop_order' AND ID LIKE %s",
					intval( $request['number'] ) . '%'
				)
			);

			// Force WP_Query return empty if don't found any order.
			$order_ids        = ! empty( $order_ids ) ? $order_ids : array( 0 );
			$args['post__in'] = $order_ids;
		}

		return $args;
	}
}
