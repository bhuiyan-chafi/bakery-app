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

### Bringing the Recipe in the Sidebar

If you have a look at the @ProductPage.tsx you will find the "recipe" menu is under the action column for each product. The client wants to move it to the sidebar. But there is a problem:

- if we move it to the sidebar, we have to select the product from a drop-down because recipe is product wise.

Now, we already have a page for the recipe which is @ProductRecipe.tsx. But page takes the product before hand. We can reuse this page by adding a logic.

- if I go from product page then I already have to product
- if I am going from the sidebar then the product is missing, in that case I can display the drop-down to select the product.

### Recipe Based Production

So, we have decided on the final change. Right now the production is made based on products. For example all the products in @product.py is expected to have a recipe and then production. But in real scenario its different. What they do is: they make a production based on a recipe and then creates end products. For example they produce a Recipe called "Yummy Bread" then they cut the loaves into three different products: family, big and small. But each of them are different products with different inventory and price. So, here is what we have to do:

- we have to remove the production and recipe option under the Action column in @ProductPage.tsx
- then we have to remove the corresponding routes and functions to clean up

- next we have to remove the product id from the Recipe model in @product.py because recipe is going to be standalone
- after removing the product connectivity we have to modify the @RecipePage.tsx page to remove the product drop down.
- also remove the route and necessary dom elements, functions
- clicking on the recipe page should take us to the recipe page where I will see a list of recipes in the system.
- under the action menu: view, edit, delete
- on top right I will have the add new recipe option
- clicking the button will bring the modal where I will have the add new recipe form
- rest of the things can remain

Next the production will take place based on Recipe instead of products. So:

- we have to modify the model Production to remove the product ID and keep the recipe id only
- which leads cleaning the routes and functions
- then in the @Productproduction.tsx page we have to remove the option to select a product before going to the main page.
- selecting the option Producton should take me directly in the production page.

Next we have to remove the "Batch Quantity" field from the form. The steps will be:

- I will select the recipe and then start the production
- I will have the same phases for the production: start, complete
- the complete status must change to finish
- once I select finish a new block should appear below:
  -- I will select a product from the drop-down and then write quntity of that product there
  -- which means I have to modify the @product.py "ProductTransaction" class to add the recipe id
  -- from the @product.py we have to remove "batch_quantity, damaged_quantity"
  -- once I click complete (the final status on the bottom right corner in the block)
  -- each product transaction will be added, the production id should also be recorded

### Total Amount of the Current Stock

If you check the @ProductPage.tsx you will see we have unit price and total unit available. My client wants:

- another column after the Current Stock as "Total Amount"
- the value will be Price\*Current Stock

### Highlight the stock in OrderPage

Check the @OrderPage.tsx where we have the "Select Product" option. Once we click, it shows the available stock. But the color is in grey. My client:

- wants to change the color to green if its above "alert quantity" amount
- make it red if its equal or below the alert quantity amount

### Products Stock are not reduced after the sell

If I complete the sell from the order page. The product stock must reduce. Isnt it? But it is not changing. Can you check the reason?

### Currency Format

If you see the [InventoryManage.tsx](file;file:///home/chafi/bakery-app/frontend/src/pages/inventory/InventoryManage.tsx) page, the amount is shown in a format like this: 30000.00. The client wants it to display like this: 30,000.00. So there will be a comma after each thousand, millions, billions.

### Permission Based Access Control

Right now in the application, I have roles for each users. But I want to go permission based acess control. So, I have to change a few things within the application.

1. Remove the UserRole enums and fields from @user.py
2. Remove codes that relates the "roles" from @user.py
3. Remove the Approved status from the UserStatus in @user.py and then check the routes and @auth.py for any connectivity. The "Active" Status should replace all "Approved" values.
4. Now that we have removed the "roles", the items on the @Sidebar.tsx is not visible for any user. Right now I cannot see any of them. But it should be visible for all users. All user should see everything. Remove any role based filtering.
5. Remove the role based information from @Settings.tsx

Now I will implement permission based access controll. Let's create one permission and implement it to test.

1. The models are defined in @user.py
2. I will create a permission "user:manage"
3. The user with this permission will be able see and operate the "User Management" block in @SettingsPage.tsx

Right now the "Your Permissions" block is visible to every one. This will enable self permission enabling to all users, which is not the goal. Only a specific user who has the permission "user:manage" can work on this feature. Now, there could be an issue while deploying an issue because the user should be pre defined with this permission. So, we can take these steps:

1. Bring the "Your Permissions" block under specific permission in @SettingsPage.tsx
2. While the app is deployed we can create this permission and add it to the admin so that he can start assigning permissions. For this initialization you can check @entrypoint.sh
3. The same permission should be assigned to "Permissions Management" feature in @SettingsPage.tsx

In the @SettingsPage.tsx we can set the permission from the user edit button. But the option is also visble beside the user details. I think this is redundent. Instead we can do this:

1. Remove the "You Permissions" block
2. Make the "User Profile" section full width
3. Add a section within "User Profile" section as "You Permissions", where we will only display the list of permissions assigned to this user. Display the list horizontally so that it doesnt take too much vertical space.

#### Product Permissions

I have already created two permissions:

- product:view
- product:manage
- users with "product:view" can see the option "Products" in @Sidebar.tsx and the content in the @ProductPage.tsx
- users with "product:manage" can perform action on the "edit, delete" operations.
- the same permission will be applied for the "Product Categories". Who can view, manage Product can also manage its categories. Thats why I am not creating any separate permissions.

#### Recipe Permissions

I have already created two permissions:

- recipe:view
- recipe:manage
- users with "recipe:view" can see the option "Recipes" in @Sidebar.tsx and the content in the @ProductRecipe.tsx
- users with "recipe:manage" can perform action on the "edit, delete" operations.

#### Production Permissions

I have already created two permissions:

- production:view
- production:manage
- users with "production:view" can see the option "Production" in @Sidebar.tsx and the content in the @ProductProduction.tsx
- users with "production:manage" can perform action on the "Start Production" which is on top right on the page. And then "start, finish, complete, and delete" operations for each productions.

#### Inventory Permissions

I have created the following permissions:

- "inventory:view", with the permission the user can see the option "Invetory" on the @Sidebar and the list of items on the @InventoryPage.tsx
- "inventory:add", with this permission the user can add a new item using the button "Add Item" button on top left section of in @InventoryPage.tsx
- "inventory:view-purchase", with this permission the user can access "Manage Inventory" feature that leads to the @InventoryManage.tsx
- "inventory:manage-purchase", with this permission the user can create, edit, and delete new purchase.

#### Order Permissions

Before we work on the Order page permissions, we have to fix the issue of product loading on the page. Since we have added permission on the products, they are not loaded on the @OrderPage.tsx.

Then I have added the following permissions and added to the user admin:

- order:view Can see the POS and place orders in @Sidebar.tsx and @OrderPage.tsx
- order:manage Can manage existing orders in @OrderManage.tsx

#### Accounts Permissions

Then I have added the following permissions and added to the user admin:

- account:view Can generate the Account Reports by accessing the option Accounts on @Sidebar.tsx
- account:manage Can add, edit, delete financial transactions by accessing the option "Miscellaneous" from top left corner in @AccountsPage.tsx

#### Sale Permissions

Before we work on the Order page permissions, we have to fix the issue of product loading on the page. Since we have added permission on the products, they are not loaded on the @SalesPage.tsx.

Then I have added the following permissions and added to the user admin:

- sale:view Can see the POS and make sales in @Sidebar.tsx and @SalesPage.tsx
- sale:orders Can access the option "My Orders" on @Sidebar.tsx

### Settings

Can we fix the "Settings" option where we have the text "v1.0.0.0 stable"?

### Fixing the Dashboard

Let's fix the dashboard items. After putting all the permissions, the items on the dashboard is not visible anymore.

- check the page @DashboardPage.tsx
- the "My Delivery Stats" on @Dashboard.tsx will be visible with "sale:orders" only

### Measurement Units

Next, we have to set permission for the measurement unit management in @SettingsPage.tsx. I have created:

- settings:measurement-unit, permission and assigned it to current admin user
- implement the permission

### Staff Management

Now we are going to implement the staff management part in the system. The feature is very simple. So, lets go step by step:

1. Option in the @Sidebar.tsx

I want to create a menu as "Staff Management" on the @Sidebar.tsx. Then:

- clickin the menu will take me to the StaffManagement.tsx page where all the users will be listed except the user with username "admin".
- on the table the following information will be displayed in each column: Name, Phone, Last Attended (no data for now), Action
- the information will be fetched from the @user.py model
- under the Action column there will be edit button.

Finish this then we will develop the edit option.

#### Edit Staff Information

The edit page will have two sections side by side:

- on the left side we will have the basic information that is related to the @user.py model: name, phone and address.
- on the right we need another section to bring this feature:
- - an input field labeled as "Field Title" and then a input field with placeholder "IBAN", and then another input field labeled as "Field Value" with placeholder "NG-xxx-xxxx-xxxx"
- - a button to submit
- this information will go to a new model which can be created as "user_other_information" where we will put dynamic key value pairs
- then below these two sections we will display all the key value pairs for this staff.

#### Attendance Column

Then I want a new column after Last Attended and before Action column as "Attendance". On that column for each user:

- the first button will be displayed as "clock-in" for that day. So the system will check first if there is an entry for that user. But where to check? Let me tell you the plan then we can design the model together.
- once the "clock in" button is pressed, it goes away and we have 3 new buttons: "excused, not-excused, half-day, clock-out". These are basically the types. But what do they mean?
- - clock in starts the day for a staff
- - excused means he finished before time but it is counted as whole day
- - not excused means he started but left without informing so the day is not counted
- - half day means counted as half day
- - clock out means the full day
- clicking any of these buttons except "clock-out" will trigger a note on an overlay modal where the admin will put something (why they finished early) and then submit.
- so the plan could be: clock-in will make an entry in the database with working day as 0. Then excused, clock-out will update it as 1. Excused will take the note as well.
- half day will update it as 0.5 with a note and clock-out will make it 1.
- not-excused will keep it 0 with a note
- and the column "Last Atteneded" is basically the last entry date in that database which indicates when he worked last.

#### View Attendance

Next I want to display the attedance information. I want:

- a button beside "edit" button which will take me to the "ViewAttendance" page.
- by default the system will fetch records of last 7 days
- on top of that table there will be a date range selector to load custom range records.
- based on the displayed record there will be a last row which will calculate number of days worked within that range.

#### Permissions

Next we have to add the permissions to each of these features. Let's start with:

- staff:view, can view the option "Staff Management" on side bar and see the list of staff.
- staff:edit, edit the staff information
- staff:management, can take the attendance. This means you can hide the whole column for the user who doesnt have this permission.
- the calender button under the action column is also connected to "staff:management" permission.

**_Bug_**:

- if I turn off "staff:management" permission it is not loading any data at all. But it should only hide the Attendance column. The user can see the list of staff.

#### Salaries

Then there will be a third button under the action column with icon "naira currency" which will take me to a new page StaffSalaryManagement.tsx and fetch records from the model @miscellaneous.py with type expense and "etransaction_on" 'employee_uuid:salary:date".

Above the table we will have a form which will have month year calender to select a month with a year. Then clicking the button "Filter" will check in the database if the salary has been settled for that month.

If no record is found, the system will give me a input field to specify the amount. The entry will be recorded in the system exactly in this format for the "transaction_on" field: 'employee_uuid:salary:date", so that we can filter it in the earlier step.

**_Chanages_**:

- first change I want is to make the "Check Salary Status" full width.
- Second, I noticed that selecting the month automatically triggers the filter, in that case do I need the "Filter" button?
- in the @AccountsPage.tsx if I chage the type "Income/Expense/Profit" it changes the titles of the table and currency color before I press "Search" button. This can be confusig for the user.
- can you format the amount in this manner 25000 to 25,000.00

### Additional Features

Now we are going to add some additional features based client's requirements.

1. Insert a search Bar, sort, and filter button on the @ManageOrder.tsx to look up orders by: order number, name, phone number, or order date. I think the easiest way will be using jsquery data table style. In the jequery datatable the search bar works for any field of data. And in each column there is a icon that sorts the rows on each column.

2. Rename “My order” to “My Delivery” in @Sidebar.tsx. Insert a search bar on the @MyDeliveriesPage.tsx to look up deliveries by: order number, Customer name, driver name, or date. I think the easiest way will be using jsquery data table style. In the jequery datatable the search bar works for any field of data. And in each column there is a icon that sorts the rows on each column.

3. Insert a search bar, sort, and filter button on the @InventoryPage.tsx and @InventoryManage.tsx. I think the easiest way will be using jsquery data table style. In the jequery datatable the search bar works for any field of data. And in each column there is a icon that sorts the rows on each column.

4. Need to do the same on @ProductPage.tsx, @CategoryPage.tsx

5. For the @ProductRecipe.tsx we have to do this only for the name field. Since the Ingredients column will contain dynamic data, I dont think it is feasible to add that.

6. For @ProductProduction.tsx page consider the following fields to implement the feature: Recipe, Status, Completed At.

7. I want the same search and sort in @StaffManagement.tsx

### Additional Information on the Payment Page

If you have a look on @StaffEditPage.tsx you will see there is an option to add additional information per staff. That information is stored in "UserOtherInformation" class under @user.py model. I want to bring this information on @StaffSalaryManagement.tsx page. The plan is to:

- make "Check Salary Status" column half a page and then on the other half put the informations. But for mobile screen they must take full row width.
