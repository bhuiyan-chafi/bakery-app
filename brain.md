# Previous work

To understand the what developments were done before this point, please read these two documents. For the backend please read this [document](./backend/bakery_app_knowledge_brain.md) and for [frontend](./frontend/bakery_app_frontend_brain.md).

## Current Developments

### Adding damaged product quantity in Production

Now I want to break the flow of the production feature to add damage quantity. Right now we are selecting the quantity and doing a production. But in a production it not sure that all the products will turn out to be good. So what can we do? We can make the production and then before the production is complete we can put the damanaged items and then click complete.

#### Idea

- the backend and front is already adjusted with the removal of "yield_type"
- we can add another column "damaged_quantity" in @product.py under Production class.
- set the default value `damaged_quantity=0` in the frontend in @ProducProduction.tsx
- then when we click on start production on the webui the column for "Damaged Items" should enable the input filed set default as 0.
- then clicking the "complete" button will store this value under "damaged_quantity" and send `batch_quantity-damaged_quantity` to the product inventory.
- but the inventory for the raw material will be reduced based on "batch_quantity".

### Adding `Active Productions` summary in Dashboard

If we see in @DashboardPage.tsx file, the first item is "Total Revenue" which is a static item. We are going to bring real data here. The first block will show the number of active Production going on.

#### Idea

- the runnings productions are those whose `status` is running.
- since productions are alwas monitored, it is not important to set a timeframe. We can simply query the table and fetch all items with status=running.

### Adding `Complete Orders, Pending Orders` in the next block

In next two block we will bring the summary of Complete Orders from last 7 days.

#### Idea

- set a time range including today to last 6 days, 7 days in total
- get the orders that has status as "complete" and "pending"
- display the "complete" orders number in the first block and then "pending" in the second
- so the final order of blocks will be Active Production > Completed Orders > Pending Orders
- but remember to mention that the Order data is of last 7 days

### Adding `Total Sale`

In the next block we are going to add the total sale of last 7 days. The idea is to get the complete sale amount from last 7 days including today.

#### Idea

- in the @order.py model we will sum up the `total` column of the last 7 days entry and then display the value.

### Fixing the `Manage Orders`

Right now if we go to manage orders, can see all the orders there. For orders which are complete it is okay. But for orders which are pending we need some additional features. Under Action column we a need a direct approval button which is set the status to complete. Right now the edit button doesn't do much. But by edit it means I should be able to edit general information plus modification of products.

#### Idea

- under the Actions column in @Manageorder.tsx, put a approve button that will complete the order. Check if there is a route already in @order.py.
- then when we click the edit button, remove the option to edit the status of the order. Because once it is approved then we have already added the balance, in that case reversing it will affect so many places.
- but add the items table so that, items can be added or removed with the existing one.

### Adding the "Accounts" feature on the sidebar

Now we are going to add the accounts feature on the sidebar. This will involve both frontend and backend parts. Lets start with the frontend part first.

#### Idea: front pages

- on the left sidebar @Sidebar.tsx add an option "Accounts" right after "Order" option.
- clicking on that feature will take us to the Accounts page.
- on that page: on the top right side we need another page connection as "Miscellaneous"

#### Idea : Accounts Page

- create a search panel where I can select a date range and then type and a button to search
- for the type I want: income, expense, profit 3 options

#### Idea: Miscellaneous Feature

- a inline form with 3 field: Transaction Type(income/expense as options), Transcation On (an open field to write a small note but not more than 15 characters), Transaction Amount (should support fractional value too), Transaction Date (a calender).
- for the backend, create a new model MiscellaneousTransactions and store these data
- create necessary backend and frontend routes

#### Idea: total expense in Accounts page

- using the date range and type expense must produce these results and display them in a table below in @AccountsPage.tsx
- all transactions in `inventory_transactions` where the type is `IN`
- all transactions in `miscellaneous_transactions` where the type is `expense`

#### Idea: total income in Accounts page

- if the type is income then all transactions in `miscellaneous_transactions` where the type is `income`
- all of the orders within that range where the status is complete in `orders` table. For the amount take the total column in consideration.

#### Idea: total profit

- try to use previous two computations and calculate the balance.
- in the table show both expenses and incomes

### Revenue block in Dashboard

So now we can add the revenue on the dashboard.

#### Plan

- in another small block calculate the revenue for last 7 days and show the balance with same coloring choice

### Restrict Access for the users

Now we are going to put some restrictions on the feature access by users. Till now all the features that we have done are for ADMIN and MANAGER ROLES.

#### Idea: Role based restrictions

- in the @Sidebar.tsx put a condition that checks the user role and if its ADMIN or MANAGER then they can see all these features.

### Separate sales page for users with role "NORMAL"

On the @Sidebar.tsx create another option "Order" and then put some simple feature there. This feature will be usable only for role with NORMAL.

#### Idea

- a name field where the current username will be set automatically and readonly.
- then customer and phone number field make mandatory
- order type: Delivery only
- status pending or complete
- then the items selection part just like @OrderPage.tsx
- in the orders table we have to add another column "sold_by" and adjust with the main @OrderPage.tsx page sale too.

### Assign a `Delivery` type order to a Salesman/Driver

Right now we have the POS, page where we can sell items directly, a customer can come and pick up or deliver to the customer's place. But there is a problem with the delivery part which is missing person who is going to deliver the order. If you look at @OrderPage.tsx which is the POS page from the admin side has a filed "Order Type" but if we select "Deliver" from there-we don't get to select the person who is going to deliver the order.

On the other-hand we have a dedicated sale page @SalesPage.tsx which is sole for the salesmen.

#### Idea

- on select "Delivery" on @OrderPage.tsx, we should be able to select the person who is going to make this delivery.
- to fetch the list of person we have to select the users with the role "normal", the enums can be found in @user.py. The fetched users should be "normal" and "act
  ive".
- and to store these details, I think we also have to make some adjustments in @order.py. Add another column "assigned_to" next to "order_type".

### Sidebar Hide

I want a hide button for the sidebar @Sidebar.tsx. If I click on it it slides the sidebar and gives a fulll width view.

### Manage Orders from the Sales Page

In @Sales.tsx page we have the option for a salesmen to make sales and take orders. Since we have created the specfic salesmen delivery system, the salesmen needs an option to update the delivery status of each orders.

#### Plan

- on sidebar (only visible to users with role "Normal" just like "Sale") create another option "Orders"
- on Orders page list the order that is assigned to that salesmen
- add details: customer name, address, phone, and under action column: check button that updates the order to delivered
- under action column: view button that will list the order item details: name, quantitiy, special note, etc.

### Backup

Read the file [db-backup.md](db-backup.md) to create the backup system.

There will be this auto script saving the database backup. But I also want a manual system to download database backups.

#### Plan

- in @SettingsPage.tsx page on top right create another button "Download DB Backup"
- clicking that button will trigger the sql backup and download a file

### User status

Right now we have a bug, for example if a new user logs in the status checks for "Approved". But it should be checking for "Active".

#### Plan

After login:

- if the status is "Approved" then the user can login and can see personal profile only
- if the status is "Active" only then the user can see expected functionalities

### Dashboard Content

Right now we have all the contents on the dashboard without filtering out the user type.

#### Plan

- admin, manager: can see everything
- staff: Active Productions
- normal: Completed Orders (completed by him only). So you have to write two queries, because the admin and manager can see the total completed orders but a normal user can see the orders that is only completed by him. Since we already have the system built in @MyDeliveriesPage.tsx, you make a plan from there.
- I would suggest you create a separate row in the @Dashboard.tsx dedicated to the user type Normal so that we can add future contents dedicated to them there.

### Upload Backup

Now that we can download backup files from the settings, its time to add the option to upload the database backup.

#### Plan

- create another button beside download as Upload DB Backup
- on click bring a modal where I can upload the sql file
- on upload it should initiate the restoration
- once complete close all the session and logout the user to log back in
- if there is an error then show a message and keep the current state

### Mobile View:

There are some issues in the mobile views.

#### Product page

In @ProductPage.tsx we have two issues in mobile view:

- the first row with "Product" and small text with button gets shrikned horizontally and becomes long vertically. So, we have to fix the view for mobile.

- also the buttons should be look nices. May be creating two rows for two things might solve the issue.

#### Inventory

- same fix for @InventoryManage.tsx and @InventoryPage.tsx

#### Orders

Fix all the views in @directory:orders

#### Accounts

Fix all the views in @directory:accounts

#### My Orders Page

Fix @MyDeliveriesPage.tsx

### Changing the Currency Symbol

The application is running in Nigeria. The symbol is Naira there. I want you to look every frontend page in "frontend/src/pages" to find the dollar symbols and then change it with Naira.
