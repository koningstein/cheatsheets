<!-- start sidebar -->
<div id="sideBar" class="relative flex flex-col flex-wrap bg-white border-r border-gray-300 p-6 flex-none w-64 md:-ml-64 md:fixed md:top-0 md:z-30 md:h-screen md:shadow-xl animated faster">
    <!-- sidebar content -->
    <div class="flex flex-col">

        <!-- sidebar toggle -->
        <div class="text-right hidden md:block mb-4">
            <button id="sideBarHideBtn">
                <i class="fad fa-times-circle"></i>
            </button>
        </div>
        <!-- end sidebar toggle -->
        @guest
            <!-- links for guests only -->
            <p class="uppercase text-xs text-gray-600 mb-4 tracking-wider">Guest</p>
            <a href="{{ route('login') }}" class="mb-3 capitalize font-medium text-sm hover:text-teal-600
                    transition ease-in-out duration-500">{{ __('Login') }}</a>
            @if(Route::has('register'))
                <a href="{{ route('register') }}" class="mb-3 capitalize font-medium text-sm hover:text-teal-600
                    transition ease-in-out duration-500">{{ __('Register') }}</a>
            @endif
        @else
            <!-- links for sales & admins -->
            <p class="uppercase text-xs text-gray-600 mb-4 tracking-wider">Admin</p>
            @hasanyrole('student|teacher|admin')
            <a href="{{ route('projects.index') }}" class="mb-3 capitalize font-medium text-sm hover:text-teal-600
                    transition ease-in-out duration-500">Project admin</a>
            <a href="{{ route('tasks.index') }}" class="mb-3 capitalize font-medium text-sm hover:text-teal-600 transition ease-in-out
                    duration-500">Task admin</a>
            @endhasanyrole
            <!-- links for logedin users -->
        @endguest
        <p class="uppercase text-xs text-gray-600 mb-4 tracking-wider">Public</p>
        <!-- link -->
        <a href="" class="mb-3 capitalize font-medium text-sm hover:text-teal-600 transition ease-in-out duration-500">
            Link1
        </a>
        <!-- end link -->
        <!-- link -->
        <a href="" class="mb-3 capitalize font-medium text-sm hover:text-teal-600 transition ease-in-out duration-500">
            Link2
        </a>
        <!-- end link -->
    </div>
    <!-- end sidebar content -->
</div>
<!-- end sidbar -->
