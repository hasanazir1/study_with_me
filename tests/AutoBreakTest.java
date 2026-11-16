package com.sakin.study;

public final class AutoBreakTest {
    static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);}
    static TimerCore finished(){TimerCore t=new TimerCore();t.configure(1,1);t.start(100,1000);check(t.finishIfDue(60100),"focus completes");return t;}
    public static void main(String[] args){
        TimerCore t=finished();t.queueAutoBreak(60100,61000);
        check(!t.startBreakIfDue(65099,65999),"full five-second grace");
        t.queueAutoBreak(62000,63000);check(t.autoBreakElapsed==65100,"queue does not extend on repeat");
        check(t.startBreakIfDue(65100,66000),"starts at five seconds");
        check(t.phase.equals("break")&&t.running()&&t.remaining(65100)==60000,"correct break duration");
        check(t.creditUntil(66000)==0,"break never adds focus credit");
        check(!t.startBreakIfDue(66000,67000),"no second automatic start");
        check(t.finishIfDue(125100),"break completes");t.queueAutoBreak(125100,126000);
        check(!t.waitingForBreak(),"next focus needs user action");
        t=finished();t.queueAutoBreak(900000,1000000);
        check(t.autoBreakElapsed==905000,"late completion still offers five seconds");
        check(t.startBreakIfDue(935000,1035000)&&t.remaining(935000)==30000,"late wake catches up from stored break start");
        t=finished();t.queueAutoBreak(60100,61000);t.cancelAutoBreak();
        check(!t.startBreakIfDue(999999,1000000),"cancel prevents restart");
        t=finished();t.queueAutoBreak(60100,61000);t.reset();check(!t.waitingForBreak(),"reset clears pending transition");
        t=finished();t.queueAutoBreak(60100,61000);t.recoverAfterReboot(62000);check(!t.waitingForBreak(),"reboot cannot reuse monotonic transition");
        t=new TimerCore();t.shortFocus(60000);t.start(100,1000);t.finishIfDue(60100);t.queueAutoBreak(60100,61000);
        check(!t.waitingForBreak(),"prayer-fit focus does not auto-start rest");
        t=finished();t.queueAutoBreak(60100,61000);t.start(62000,63000);
        check(t.phase.equals("break")&&!t.waitingForBreak(),"manual start takes over immediately");
        System.out.println("PASS: automatic rest grace, cancellation, delayed wake, reboot, idempotence and prayer-fit exception");
    }
}
