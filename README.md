# ShopFast
# Simple E-Commerce Project
 using HTML, CSS, and Vanilla JavaScript.

## Project Setup and Execution

Because the JavaScript uses the Fetch API to load product data from a local JSON file, running the index.html file directly by double-clicking it may cause browser security (CORS) restrictions. 

To run the project properly:
1. Open the project folder in Visual Studio Code.
2. Launch the project using the "Live Server" extension by clicking "Go Live" at the bottom of the window.
3. The application will automatically open in your default browser.

Alternatively, you can use any local development server (such as Python's HTTP server module) pointing to this directory.

## Project Structure

* index.html - Defines the structural layout of the storefront and the shopping cart interface.
* style.css - Contains layout rules, responsive design queries, grid/flexbox styles, and visual theme configurations.
* script.js - Handles application logic including data fetching, DOM manipulation, cart computations, and state updates.
* data.json - Functions as a lightweight local database storing product arrays with descriptions, pricing, and asset links.

## Core Features Implemented

* Dynamic Data Loading: Asynchronously fetches and parses product lists from data.json upon page initialization.
* Fully Functional Cart: Supports structural operations including adding items to the cart, modifying quantities, removing items, and re-calculating sub-totals in real time.
* Local State Persistence: Implements standard localStorage integration to preserve user shopping cart data across page refreshes.
