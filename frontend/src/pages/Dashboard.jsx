import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Manager data
  const [performance, setPerformance] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  
  // Agent data
  const [deliveries, setDeliveries] = useState([]);
  const [statusUpdating, setStatusUpdating] = useState(null); // stores dispatch ID being edited
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  const isAgent = user?.role === 'AGENT';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (isAgent) {
        // Fetch assigned dispatches
        const res = await api.get('shipments/dispatches/');
        setDeliveries(res.data);
      } else {
        // Fetch analytics
        const [perfRes, lowRes, occRes] = await Promise.all([
          api.get('shipments/dispatches/performance/'),
          api.get('inventory/items/low-stock/'),
          api.get('inventory/zones/occupancy/'),
        ]);
        setPerformance(perfRes.data);
        setLowStock(lowRes.data);
        setOccupancy(occRes.data);
      }
    } catch (err) {
      setError('Could not load dashboard information. Please refresh.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAgent]);

  const handleUpdateStatus = async (dispatchId) => {
    if (!newStatus) return;
    try {
      await api.patch(`shipments/dispatches/${dispatchId}/`, {
        status: newStatus,
        notes: notes,
      });
      setStatusUpdating(null);
      setNewStatus('');
      setNotes('');
      fetchData(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.status || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container flex flex-col items-center justify-center h-screen bg-background">
        <div className="spinner"></div>
        <p className="text-muted-foreground text-sm">Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="alert-danger mb-6 p-4 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">{error}</div>
        <Button className="bg-primary text-primary-foreground" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  // --- DELIVERY AGENT LANDING DASHBOARD ---
  if (isAgent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">My Deliveries</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Below are the shipments currently assigned to you for dispatch and tracking.
          </p>
        </div>

        {deliveries.length === 0 ? (
          <Card className="border-border bg-card text-center p-12 shadow-lg">
            <CardContent>
              <p className="text-muted-foreground text-sm">No active deliveries assigned to you.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveries.map((dispatch) => (
              <Card key={dispatch.id} className="border-border bg-card shadow-lg p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <strong className="font-outfit text-lg text-foreground font-semibold">{dispatch.order_number}</strong>
                    <span className={`status-badge text-xs font-bold px-2 py-1 rounded ${
                      dispatch.status === 'DELIVERED' ? 'success' : 
                      dispatch.status === 'FAILED' ? 'danger' : 'warning'
                    }`}>
                      {dispatch.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="text-foreground">
                      <strong className="text-muted-foreground">Destination:</strong> {dispatch.destination}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Expected Delivery: {new Date(dispatch.expected_delivery_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  {statusUpdating === dispatch.id ? (
                    <div className="border-t border-border pt-4 space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="update-status" className="text-xs uppercase text-muted-foreground font-semibold">New Status</Label>
                        <select 
                          id="update-status" 
                          className="select-filter w-full bg-accent/40 border border-border text-foreground rounded p-2 text-sm" 
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                        >
                          <option value="">Select Status...</option>
                          <option value="IN_TRANSIT">In Transit</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="FAILED">Failed</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="update-notes" className="text-xs uppercase text-muted-foreground font-semibold">Remarks/Notes</Label>
                        <Input 
                          type="text" 
                          id="update-notes" 
                          className="bg-accent/40 border-border text-foreground" 
                          placeholder="e.g. Left with receptionist" 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          className="flex-1 bg-primary text-primary-foreground text-xs py-2"
                          onClick={() => handleUpdateStatus(dispatch.id)}
                        >
                          Save
                        </Button>
                        <Button 
                          className="flex-1 bg-accent hover:bg-accent/80 text-foreground text-xs py-2"
                          onClick={() => setStatusUpdating(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    dispatch.status !== 'DELIVERED' && dispatch.status !== 'FAILED' && (
                      <Button 
                        className="w-full bg-primary text-primary-foreground font-semibold py-2 text-sm"
                        onClick={() => {
                          setStatusUpdating(dispatch.id);
                          setNewStatus(dispatch.status);
                        }}
                      >
                        Update Delivery Status
                      </Button>
                    )
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- WAREHOUSE MANAGER LANDING DASHBOARD ---
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-outfit text-3xl font-bold text-foreground">Logistics Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time warehouse utilization and shipping operations overview.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border bg-card shadow-lg p-6">
          <CardHeader className="p-0 pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Total Dispatches</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-outfit text-3xl font-bold text-foreground">{performance?.total_dispatches || 0}</div>
            <p className="text-muted-foreground text-xs mt-2">Outbound dispatches created</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-lg p-6">
          <CardHeader className="p-0 pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Pending Deliveries</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-outfit text-3xl font-bold text-foreground">{performance?.pending_deliveries || 0}</div>
            <p className="text-muted-foreground text-xs mt-2">In transit or scheduled</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-lg p-6">
          <CardHeader className="p-0 pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Low Stock Alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`font-outfit text-3xl font-bold ${lowStock.length > 0 ? 'text-amber-500' : 'text-foreground'}`}>
              {lowStock.length}
            </div>
            <p className={`text-xs mt-2 ${lowStock.length > 0 ? 'text-amber-500/80' : 'text-muted-foreground'}`}>
              {lowStock.length > 0 ? 'Items need reordering' : 'All stock levels healthy'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-lg p-6">
          <CardHeader className="p-0 pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">On-Time Delivery Rate</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="font-outfit text-3xl font-bold text-foreground">
              {performance?.on_time_delivery_rate !== undefined ? `${performance.on_time_delivery_rate}%` : 'N/A'}
            </div>
            <p className="text-muted-foreground text-xs mt-2">Target: &gt;95% On-Time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Zone Occupancy Details */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card shadow-lg p-6 h-full">
            <CardHeader className="p-0 pb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-outfit text-xl font-bold text-foreground">Storage Utilization</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">Warehouse layout tracking metrics</CardDescription>
              </div>
              <span className="zone-code-badge text-xs font-bold">{occupancy.length} Zones Total</span>
            </CardHeader>
            
            <CardContent className="p-0 space-y-6">
              {occupancy.map((zone) => {
                const isOverloaded = zone.occupancy_rate > 90;
                const isWarning = zone.occupancy_rate > 70 && zone.occupancy_rate <= 90;
                
                return (
                  <div key={zone.id} className="p-4 bg-accent/10 border border-border/60 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="font-outfit text-foreground font-semibold">{zone.name}</strong>
                        <span className="text-xs text-muted-foreground ml-2">({zone.code})</span>
                      </div>
                      <span className={`text-sm font-bold ${
                        isOverloaded ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {zone.occupancy_rate}%
                      </span>
                    </div>

                    <Progress 
                      value={zone.occupancy_rate} 
                      className="h-2 bg-secondary"
                      indicatorClassName={
                        isOverloaded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }
                    />

                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Stored Weight: {zone.current_weight} kg / {zone.max_weight_capacity} kg limit</span>
                      <span>{zone.item_count} Items</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Low Stock Alert Lists */}
        <div>
          <Card className="border-border bg-card shadow-lg p-6 h-full">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="font-outfit text-xl font-bold text-foreground">Low Stock Items</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">Alerts for reorder targets</CardDescription>
            </CardHeader>
            
            <CardContent className="p-0">
              {lowStock.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  All inventory quantities are currently healthy.
                </div>
              ) : (
                <div className="space-y-4">
                  {lowStock.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <span className="status-badge danger px-2 py-0.5 rounded text-xs font-bold">
                          Qty: {item.quantity}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-1">Limit: {item.low_stock_threshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
