<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Table from "$lib/components/ui/table";
  import dummyData from "../../../../../convex/dummyData.json";
  import { MessageSquare, Users, Search, Bot } from "lucide-svelte";
  
  // 1. Calculate Metrics
  const totalRevenue = dummyData.transactionRecords.reduce((sum, record) => sum + record.totalRevenue, 0);
  const totalUsers = dummyData.users.length;
  const totalSales = dummyData.transactionRecords.length;
  const activeComplaints = dummyData.complaintTickets.filter(t => t.status === "open").length;

  // 2. Process Recent Orders
  const recentOrders = dummyData.transactionRecords.map(trans => {
    const res = dummyData.reservations.find(r => r._id === trans.reservationId);
    let customerName = "Unknown";
    let status = "completed";
    if (res) {
        const user = dummyData.users.find(u => u._id === res.customerId);
        if (user) customerName = user.email.split("@")[0]; // Just the username part
        status = res.status;
    }
    return {
        id: trans._id,
        customer: customerName,
        amount: `$${trans.totalRevenue.toFixed(2)}`,
        status: status
    };
  }).slice(0, 5);

  // 3. Process Chart Data (Revenue by Medicine)
  const revenueByMedicine: Record<string, number> = {};
  dummyData.transactionRecords.forEach(trans => {
    trans.itemsSnapshot.forEach(item => {
        const med = dummyData.medicines.find(m => m._id === item.medicineId);
        const name = med ? med.name : 'Unknown';
        const revenue = item.quantity * item.unitSellingPriceAtSale;
        revenueByMedicine[name] = (revenueByMedicine[name] || 0) + revenue;
    });
  });

  const chartData = Object.entries(revenueByMedicine).map(([name, value]) => ({
    name,
    value
  }));
  // Pie Chart Calculation
  const totalChartValue = chartData.reduce((sum, d) => sum + d.value, 0);
  let currentPercentage = 0;
  // Use tailwind-compatible vivid colors for the slices
  const colors = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#eab308"];
  
  const pieChartData = chartData.map((d, i) => {
    const percentage = (d.value / totalChartValue) * 100;
    const start = currentPercentage;
    currentPercentage += percentage;
    return {
      ...d,
      color: colors[i % colors.length],
      startPercentage: start,
      endPercentage: currentPercentage,
      percentage
    };
  });
  
  const conicGradient = pieChartData
    .map(d => `${d.color} ${d.startPercentage}% ${d.endPercentage}%`)
    .join(", ");
</script>

<div class="dashboard-container">
  <div class="dashboard-header">
    <h1 class="dashboard-title">Admin Reports & Analytics</h1>
    <Button variant="default">Download Report</Button>
  </div>

  <div class="dashboard-grid">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Total Revenue</Card.Title>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dashboard-card-icon">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">${totalRevenue.toFixed(2)}</div>
        <br>
        <p class="text-xs text-muted-foreground">Across all transactions</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Total Users</Card.Title>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dashboard-card-icon">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">{totalUsers}</div>
        <br>
        <p class="text-xs text-muted-foreground">Registered on platform</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Sales</Card.Title>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dashboard-card-icon">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M2 10h20" />
        </svg>
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">{totalSales}</div>
        <br>
        <p class="text-xs text-muted-foreground">Total completed orders</p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="dashboard-card-title">Active Complaints</Card.Title>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dashboard-card-icon">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </Card.Header>
      <Card.Content>
        <div class="dashboard-card-value">{activeComplaints}</div>
        <br>
        <p class="text-xs text-muted-foreground">Require attention</p>
      </Card.Content>
    </Card.Root>
  </div>

  <div class="flex items-center mt-8 mb-4">
    <h2 class="text-xl font-semibold tracking-tight">Quick Actions</h2>
  </div>

  <div class="dashboard-grid">
    <a href="/admin/Recieved_com" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <MessageSquare class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform"/>
          <Card.Title>Received Complaints</Card.Title>
          <Card.Description>Review and resolve user and pharmacy tickets.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>
    
    <a href="/admin/users" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Users class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform"/>
          <Card.Title>User Management</Card.Title>
          <Card.Description>Manage customer and pharmacist accounts.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/pharmacy" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Search class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform"/>
          <Card.Title>Search Pharmacy</Card.Title>
          <Card.Description>Locate and verify registered pharmacies.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>

    <a href="/ai-assistant" class="block group">
      <Card.Root class="h-full hover:border-primary/50 hover:bg-muted/10 transition-colors cursor-pointer">
        <Card.Header>
          <Bot class="h-7 w-7 text-primary mb-2 group-hover:scale-110 transition-transform"/>
          <Card.Title>AI Assistance</Card.Title>
          <Card.Description>Get automated insights and administrative help.</Card.Description>
        </Card.Header>
      </Card.Root>
    </a>
  </div>

  <div class="dashboard-section mt-8">
    <Card.Root class="dashboard-chart-area">
      <Card.Header>
        <Card.Title>Revenue by Medicine</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col md:flex-row items-center justify-center gap-12 h-[300px] w-full pt-4 pb-4">
          <!-- Pie Chart -->
          <div 
            class="w-56 h-56 rounded-full shadow-md relative"
            style={`background: conic-gradient(${conicGradient});`}
          >
            <!-- Donut Hole -->
            <div class="absolute inset-5 bg-card rounded-full flex items-center justify-center shadow-inner">
              <span class="text-sm font-semibold text-muted-foreground">Revenue</span>
            </div>
          </div>
          
          <!-- Legend -->
          <div class="flex flex-col gap-4">
            {#each pieChartData as data}
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={`background-color: ${data.color};`}></div>
                <div class="text-sm font-medium">
                  {data.name} 
                  <span class="text-muted-foreground ml-1">
                    (${data.value.toFixed(2)} - {data.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </Card.Content>
    </Card.Root>
    <Card.Root class="dashboard-recent-area">
      <Card.Header>
        <Card.Title>Recent Sales</Card.Title>
        <Card.Description>Top recent transactions.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Order</Table.Head>
              <Table.Head>Customer</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head class="text-right">Amount</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each recentOrders as order}
              <Table.Row>
                <Table.Cell class="font-medium">{order.id}</Table.Cell>
                <Table.Cell>{order.customer}</Table.Cell>
                <Table.Cell>
                  <Badge variant={order.status === "completed" ? "default" : order.status === "cancelled" ? "destructive" : "secondary"}>
                    {order.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-right">{order.amount}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  </div>
</div>
