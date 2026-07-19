import { browser } from "$app/environment";
import { goto } from "$app/navigation";

class UserSession {
  role = $state<'customer' | 'admin' | 'pharmacist'>('customer');

  constructor() {
    if (browser) {
      const stored = localStorage.getItem("user_role");
      if (stored === "customer" || stored === "admin" || stored === "pharmacist") {
        this.role = stored;
      }
    }
  }

  setRole(newRole: 'customer' | 'admin' | 'pharmacist') {
    this.role = newRole;
    if (browser) {
      localStorage.setItem("user_role", newRole);
      
      // Redirect to the appropriate dashboard
      if (newRole === 'admin') {
        goto('/admin/dashboard');
      } else if (newRole === 'pharmacist') {
        goto('/pharmacist/dashboard');
      } else {
        goto('/dashboard');
      }
    }
  }
}

export const userSession = new UserSession();
